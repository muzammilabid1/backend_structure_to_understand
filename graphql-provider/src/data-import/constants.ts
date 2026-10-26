// FIXME(cj): Replace this hard-coded flag with a per- import attempt value
// stored in a new import log table, to allow us to implement one-off 'partial'
// imports (which don't generate delete operations).
export const IS_COMPLETE_IMPORT = true;
