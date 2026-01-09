import { createStateGraph, graphStore, graphStateNode } from 'ts-edge';
import type {
  TestPlan,
  Endpoint,
  WaitNode,
  AssertionNode,
  Edge,
  HttpMethod,
  ResponseFormat,
  Frequency,
} from './types';
import { START, END } from './constants';

export interface ApiCheckBuilderConfig {
  name: string;
  endpoint_host: string;
}

// State type for storing responses and metadata
interface TestState {
  responses: Record<string, any>;
  endpoint_host: string;
  setResponse: (nodeId: string, response: any) => void;
  getResponse: (nodeId: string) => any;
  getAllResponses: () => Record<string, any>;
}

// Create the state store
const createTestStore = (endpointHost: string) =>
  graphStore<TestState>((set, get) => ({
    responses: {},
    endpoint_host: endpointHost,
    setResponse(nodeId: string, response: any) {
      set((state) => ({
        responses: { ...state.responses, [nodeId]: response },
      }));
    },
    getResponse(nodeId: string) {
      return get().responses[nodeId];
    },
    getAllResponses() {
      return get().responses;
    },
  }));

export class ApiCheckBuilder {
  private config: ApiCheckBuilderConfig;
  private store: ReturnType<typeof createTestStore>;
  private graph: ReturnType<typeof createStateGraph<TestState>>;
  private nodeIds: string[] = [];
  private startNode: string | null = null;
  private endNode: string | null = null;
  // Track nodes and edges for serialization
  private nodeData: Map<
    string,
    { type: string; data: Endpoint | WaitNode | AssertionNode }
  > = new Map();
  private edgeData: Edge[] = [];

  constructor(config: ApiCheckBuilderConfig) {
    this.config = config;
    this.store = createTestStore(config.endpoint_host);
    this.graph = createStateGraph(this.store);
  }

  addEndpoint(
    id: string,
    options: {
      method: HttpMethod;
      response_format: ResponseFormat;
      path: string;
      headers?: Record<string, string>;
      body?: any;
    }
  ): this {
    this.nodeIds.push(id);

    // Track for serialization
    const endpoint: Endpoint = {
      id,
      type: 'endpoint',
      method: options.method,
      path: options.path,
      response_format: options.response_format,
      headers: options.headers,
      body: options.body,
    };
    this.nodeData.set(id, { type: 'endpoint', data: endpoint });

    this.graph.addNode(
      graphStateNode({
        name: id,
        execute: async (state: TestState) => {
          const endpointHost = state.endpoint_host;
          const url = `${endpointHost}${options.path}`;

        // Import axios dynamically to avoid bundling issues
        const axios = require('axios');

        try {
          const response = await axios({
            method: options.method,
            url,
            headers: options.headers,
            data: options.body,
            timeout: 30000,
          });

          let parsedResponse = response.data;
          if (options.response_format === 'JSON' && typeof response.data === 'string') {
            parsedResponse = JSON.parse(response.data);
          }

          // Store response in state
          state.setResponse(id, parsedResponse);

          return {
            nodeId: id,
            type: 'endpoint',
            success: true,
            response: parsedResponse,
          };
        } catch (error: any) {
          let errorMessage = 'Unknown error';
          if (error.code === 'ECONNREFUSED') {
            errorMessage = `Connection refused - is the server running on ${url}?`;
          } else if (error.code === 'ETIMEDOUT') {
            errorMessage = `Request timed out after 30000ms`;
          } else if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          } else if (error.message) {
            errorMessage = error.message;
          }

          return {
            nodeId: id,
            type: 'endpoint',
            success: false,
            error: errorMessage,
          };
        }
      },
      })
    );

    return this;
  }

  addWait(id: string, duration: { minutes?: number; seconds?: number }): this {
    this.nodeIds.push(id);
    const duration_ms =
      (duration.minutes || 0) * 60 * 1000 + (duration.seconds || 0) * 1000;

    // Track for serialization
    const waitNode: WaitNode = {
      id,
      type: 'wait',
      duration_ms,
    };
    this.nodeData.set(id, { type: 'wait', data: waitNode });

    this.graph.addNode(
      graphStateNode({
        name: id,
        execute: async (state: TestState) => {
          await new Promise((resolve) => setTimeout(resolve, duration_ms));
          return {
            nodeId: id,
            type: 'wait',
            success: true,
          };
        },
      })
    );

    return this;
  }

  addAssertions(
    id: string,
    fn: (
      responses: Record<string, any>,
      asserts: any
    ) => Array<{ type: string; expected?: any; actual?: any; message?: string }>
  ): this {
    this.nodeIds.push(id);

    // Track for serialization
    const assertionNode: AssertionNode = {
      id,
      type: 'assertion',
      assertions: [], // Will be evaluated at runtime
    };
    this.nodeData.set(id, { type: 'assertion', data: assertionNode });

    this.graph.addNode(
      graphStateNode({
        name: id,
        execute: async (state: TestState) => {
          const allResponses = state.getAllResponses();

        // Import assertions helper
        const { asserts } = require('./assertions');

        // Evaluate assertion function with responses
        const assertions = fn(allResponses, asserts);

        const errors: string[] = [];

        for (const assertion of assertions) {
          switch (assertion.type) {
            case 'isEqual':
              if (assertion.expected !== assertion.actual) {
                errors.push(
                  assertion.message ||
                    `Expected ${assertion.expected}, but got ${assertion.actual}`
                );
              }
              break;
            case 'notNull':
              if (assertion.actual === null || assertion.actual === undefined) {
                errors.push(assertion.message || 'Expected value to not be null');
              }
              break;
            case 'isTrue':
              if (assertion.actual !== true) {
                errors.push(assertion.message || 'Expected value to be true');
              }
              break;
            case 'isFalse':
              if (assertion.actual !== false) {
                errors.push(assertion.message || 'Expected value to be false');
              }
              break;
            default:
              errors.push(`Unknown assertion type: ${assertion.type}`);
          }
        }

        return {
          nodeId: id,
          type: 'assertion',
          success: errors.length === 0,
          error: errors.length > 0 ? errors.join('; ') : undefined,
        };
      },
      })
    );

    return this;
  }

  addEdge(from: string, to: string): this {
    if (from === START) {
      this.startNode = to;
      // Track for serialization
      this.edgeData.push({ from: START, to });
    } else if (to === END) {
      this.endNode = from;
      // Track for serialization
      this.edgeData.push({ from, to: END });
    } else {
      // Use type assertion to bypass strict typing since we're serializing anyway
      (this.graph as any).edge(from, to);
      // Track for serialization
      this.edgeData.push({ from, to });
    }
    return this;
  }

  create(options: { frequency?: Frequency }): TestPlan {
    // Note: We don't compile/execute here - we just serialize to JSON
    // The graph is built using ts-edge for future execution capabilities,
    // but for now we serialize to the JSON format for the executor

    // Serialize the graph to our JSON format
    const plan = this.serializeToPlan(options.frequency);

    // Output JSON (for CLI to capture)
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }

  toJSON(): string {
    const plan = this.serializeToPlan();
    return JSON.stringify(plan, null, 2);
  }

  private serializeToPlan(frequency?: Frequency): TestPlan {
    return {
      name: this.config.name,
      endpoint_host: this.config.endpoint_host,
      frequency,
      nodes: this.getSerializedNodes(),
      edges: this.edgeData, // Already includes START/END edges
    };
  }

  private getSerializedNodes(): (Endpoint | WaitNode | AssertionNode)[] {
    return Array.from(this.nodeData.values()).map((item) => item.data);
  }

  private getSerializedEdges(): Edge[] {
    return this.edgeData;
  }
}
