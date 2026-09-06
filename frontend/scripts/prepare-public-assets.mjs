import "./copy-ort-assets.mjs";

if (process.env.NETRAI_BUNDLE_OFFLINE_MODEL === "true") {
  console.log("Preparing Android/offline build with bundled ONNX model.");
} else {
  console.log("Preparing web build; local offline ONNX model will be excluded by Vite.");
}
