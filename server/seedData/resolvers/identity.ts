import { InsertedDocs } from '../../types/populate';

/**
 * A resolver that returns the document unchanged without resolving any references.
 * Acts as an identity function for documents that don't need reference resolution.
 * @param doc - The document to process.
 * @param _ - Inserted documents map (unused in this resolver).
 * @returns {T} - The original document unchanged.
 */
const identityResolver = <T>(doc: T, _: InsertedDocs): T => doc;

export default identityResolver;
