"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTracing = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_kafkajs_1 = require("@opentelemetry/instrumentation-kafkajs");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const sdk = new sdk_node_1.NodeSDK({
    traceExporter: new exporter_jaeger_1.JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    }),
    instrumentations: [
        new instrumentation_http_1.HttpInstrumentation(),
        new instrumentation_kafkajs_1.KafkaJsInstrumentation(), // Garante que o trace_id vá nos headers do Kafka
    ],
});
const initTracing = () => {
    sdk.start();
};
exports.initTracing = initTracing;
