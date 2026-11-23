// Forwarder for test suite in CommonJS
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("./DonationTracker.cjs");
