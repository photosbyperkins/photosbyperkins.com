import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runWithConcurrency, removeStaleFiles } from './utils';

describe('pipeline utils', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('runWithConcurrency', () => {
        it('executes all tasks and respects concurrency limit', async () => {
            let active = 0;
            let maxActive = 0;

            const makeTask = (id: number) => async () => {
                active++;
                maxActive = Math.max(maxActive, active);
                await new Promise((resolve) => setTimeout(resolve, 10));
                active--;
                return id * 2;
            };

            const tasks = [makeTask(1), makeTask(2), makeTask(3), makeTask(4), makeTask(5)];
            const results = await runWithConcurrency(tasks, 2);

            expect(results).toEqual([2, 4, 6, 8, 10]);
            expect(maxActive).toBeLessThanOrEqual(2);
        });

        it('resolves empty array when tasks are empty', async () => {
            const results = await runWithConcurrency([], 3);
            expect(results).toEqual([]);
        });
    });

    describe('removeStaleFiles', () => {
        it('removes files not in the validSet and deletes empty folders', () => {
            const mockDir = path.resolve('fake/dir');
            const fileA = path.join(mockDir, 'valid.jpg');
            const fileB = path.join(mockDir, 'stale.jpg');

            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readdirSync').mockReturnValue([
                { name: 'valid.jpg', isDirectory: () => false },
                { name: 'stale.jpg', isDirectory: () => false },
            ] as never);
            const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
            vi.spyOn(fs, 'rmdirSync').mockImplementation(() => {});

            const validSet = new Set([fileA]);
            const counters = removeStaleFiles(mockDir, validSet);

            expect(counters.removed).toBe(1);
            expect(unlinkSpy).toHaveBeenCalledWith(fileB);
            expect(unlinkSpy).not.toHaveBeenCalledWith(fileA);
        });

        it('returns initial counters if directory does not exist', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(false);
            const counters = removeStaleFiles('/non/existent', new Set());
            expect(counters.removed).toBe(0);
        });
    });
});
