import type sharp from 'sharp';
import 'dotenv/config';

export interface MetadataOptions {
    year?: string | number;
    title?: string;
    creator?: string;
    siteUrl?: string;
    licenseUrl?: string;
    description?: string;
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case '\'':
                return '&apos;';
            case '"':
                return '&quot;';
            default:
                return c;
        }
    });
}

export function getResolvedMetadata(options?: MetadataOptions) {
    const creator = options?.creator || process.env.VITE_COPYRIGHT_NAME || 'Michael Perkins';
    const siteUrl =
        options?.siteUrl ||
        process.env.VITE_SITE_URL ||
        (process.env.VITE_SITE_DOMAIN
            ? `https://${process.env.VITE_SITE_DOMAIN.replace(/^https?:\/\//, '')}`
            : 'https://photosbyperkins.com');
    const licenseUrl =
        options?.licenseUrl || process.env.VITE_LICENSE_URL || 'https://creativecommons.org/licenses/by-sa/4.0/';
    const year = options?.year || new Date().getFullYear();
    const copyrightNotice = `Copyright (c) ${year} ${creator}. All rights reserved. Licensed under CC BY-SA 4.0.`;
    const attributionText =
        options?.description ||
        (options?.title
            ? `${options.title} - Photo by ${creator} / photosbyperkins.com (CC BY-SA 4.0)`
            : `Photo by ${creator} / photosbyperkins.com (CC BY-SA 4.0)`);

    return {
        creator,
        siteUrl,
        licenseUrl,
        year,
        copyrightNotice,
        attributionText,
    };
}

export function buildXmpPacket(options?: MetadataOptions): string {
    const meta = getResolvedMetadata(options);

    return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:cc="http://creativecommons.org/ns#"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">
   <dc:creator>
    <rdf:Seq>
     <rdf:li>${escapeXml(meta.creator)}</rdf:li>
    </rdf:Seq>
   </dc:creator>
   <dc:rights>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(meta.copyrightNotice)}</rdf:li>
    </rdf:Alt>
   </dc:rights>
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(meta.attributionText)}</rdf:li>
    </rdf:Alt>
   </dc:description>
   <xmpRights:Marked>True</xmpRights:Marked>
   <xmpRights:WebStatement>${escapeXml(meta.licenseUrl)}</xmpRights:WebStatement>
   <xmpRights:UsageTerms>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).</rdf:li>
    </rdf:Alt>
   </xmpRights:UsageTerms>
   <cc:license>${escapeXml(meta.licenseUrl)}</cc:license>
   <cc:attributionName>${escapeXml(meta.creator)}</cc:attributionName>
   <cc:attributionURL>${escapeXml(meta.siteUrl)}</cc:attributionURL>
   <photoshop:Credit>${escapeXml(meta.creator)}</photoshop:Credit>
   <photoshop:Source>${escapeXml(meta.siteUrl)}</photoshop:Source>
   <Iptc4xmpCore:CreatorContactInfo>
    <rdf:Description>
     <Iptc4xmpCore:CiUrlWork>${escapeXml(meta.siteUrl)}</Iptc4xmpCore:CiUrlWork>
    </rdf:Description>
   </Iptc4xmpCore:CreatorContactInfo>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export function buildExifTags(options?: MetadataOptions): Record<string, Record<string, string>> {
    const meta = getResolvedMetadata(options);

    return {
        IFD0: {
            Artist: meta.creator,
            Copyright: meta.copyrightNotice,
            ImageDescription: meta.attributionText,
        },
    };
}

export function applyPhotoMetadata(pipeline: sharp.Sharp, options?: MetadataOptions): sharp.Sharp {
    const exifTags = buildExifTags(options);
    const xmp = buildXmpPacket(options);

    return pipeline.withExifMerge(exifTags).withXmp(xmp);
}
