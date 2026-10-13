"""Batched inference path: padded static batches must equal one-at-a-time results."""

import time

import numpy as np
import pytest

onnx = pytest.importorskip('onnx')
from onnx import TensorProto, helper  # noqa: E402

from ml.runtime import OrtModel, ort  # noqa: E402
from ml.scheduler import _STOP, _GpuWorker  # noqa: E402

pytestmark = pytest.mark.skipif(ort is None, reason='onnxruntime not installed')


@pytest.fixture(scope='module')
def dynamic_model(tmp_path_factory):
    """y = conv(x) * 2 + 1 with input/outputs shaped ['batch', ...]. Two outputs, both batch-major."""
    rng = np.random.default_rng(0)
    w = rng.standard_normal((4, 3, 3, 3)).astype(np.float32)
    nodes = [
        helper.make_node('Conv', ['x', 'w'], ['c'], pads=[1, 1, 1, 1]),
        helper.make_node('Mul', ['c', 'two'], ['m']),
        helper.make_node('Add', ['m', 'one'], ['y']),
        helper.make_node('ReduceMean', ['y'], ['s'], axes=[2, 3], keepdims=0),
    ]
    graph = helper.make_graph(
        nodes, 'dyn',
        [helper.make_tensor_value_info('x', TensorProto.FLOAT, ['batch', 3, 8, 8])],
        [helper.make_tensor_value_info('y', TensorProto.FLOAT, ['batch', 4, 8, 8]),
         helper.make_tensor_value_info('s', TensorProto.FLOAT, ['batch', 4])],
        initializer=[
            helper.make_tensor('w', TensorProto.FLOAT, w.shape, w.flatten()),
            helper.make_tensor('two', TensorProto.FLOAT, [], [2.0]),
            helper.make_tensor('one', TensorProto.FLOAT, [], [1.0]),
        ],
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 13)])
    model.ir_version = 8
    path = tmp_path_factory.mktemp('onnx') / 'dyn.onnx'
    onnx.save(model, str(path))
    return str(path)


def _blobs(n):
    rng = np.random.default_rng(1)
    return [rng.standard_normal((1, 3, 8, 8)).astype(np.float32) for _ in range(n)]


@pytest.mark.parametrize('n', [1, 3, 4, 6, 9])
def test_batched_equals_single(dynamic_model, n):
    single = OrtModel(dynamic_model, use_gpu=False, batch_size=1)
    batched = OrtModel(dynamic_model, use_gpu=False, batch_size=4)
    blobs = _blobs(n)
    ref = single.run_batch(blobs)
    got = batched.run_batch(blobs)
    assert len(got) == n  # padding dropped
    for r, g in zip(ref, got):
        assert len(r) == len(g) == 2
        for ro, go in zip(r, g):
            assert go.shape == ro.shape
            np.testing.assert_allclose(go, ro, rtol=1e-5, atol=1e-5)


def test_gpu_worker_batches_and_routes_outputs(dynamic_model):
    """Entries from several items are grouped into full batches and routed back by index."""
    model = OrtModel(dynamic_model, use_gpu=False, batch_size=4)
    calls = []
    real = model.run_batch

    def spy(blobs):
        calls.append(len(blobs))
        return real(blobs)

    model.run_batch = spy

    class FakeItem:
        def __init__(self, n):
            self.outs = {'s': [None] * n}
            self.results = {}
            self.pending = n

    finished = []
    worker = _GpuWorker(finished.append, batch_timeout=0.01)
    worker.start()
    items = [FakeItem(3) for _ in range(3)]  # 9 requests -> batches of 4, 4, 1
    blobs = _blobs(9)
    k = 0
    for it in items:
        entries = []
        for i in range(3):
            entries.append((it, 's', i, model, blobs[k]))
            k += 1
        worker.q.put(entries)
    deadline = time.time() + 5
    while len(finished) < 3 and time.time() < deadline:
        time.sleep(0.01)
    worker.q.put(_STOP)
    worker.join(timeout=5)

    assert len(finished) == 3
    assert sorted(calls, reverse=True)[:2] == [4, 4] and sum(calls) == 9
    ref = OrtModel(dynamic_model, use_gpu=False).run_batch(blobs)
    k = 0
    for it in items:
        for i in range(3):
            np.testing.assert_allclose(it.outs['s'][i][1], ref[k][1], rtol=1e-5, atol=1e-5)
            k += 1
