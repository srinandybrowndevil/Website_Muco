export { POST } from "@muco/core/breach-route";

// The browser calls a same-origin path, and these four applications are four
// origins, so each one carries this file. The implementation is shared: it
// accepts five characters of a hash and nothing else, which is what stops it
// being used as a general-purpose request forwarder.
