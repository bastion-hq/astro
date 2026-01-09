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

export class ApiCheckBuilder {
  private config: ApiCheckBuilderConfig;
  private nodes: (Endpoint | WaitNode | AssertionNode)[] = [];
  private edges: Edge[] = [];

  constructor(config: ApiCheckBuilderConfig) {
    this.config = config;
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
    const endpoint: Endpoint = {
      id,
      type: 'endpoint',
      method: options.method,
      path: options.path,
      response_format: options.response_format,
      headers: options.headers,
      body: options.body,
    };
    this.nodes.push(endpoint);
    return this;
  }

  addWait(id: string, duration: { minutes?: number; seconds?: number }): this {
    const duration_ms =
      (duration.minutes || 0) * 60 * 1000 + (duration.seconds || 0) * 1000;
    const waitNode: WaitNode = {
      id,
      type: 'wait',
      duration_ms,
    };
    this.nodes.push(waitNode);
    return this;
  }

  addAssertions(
    id: string,
    fn: (
      responses: Record<string, any>,
      asserts: any
    ) => Array<{ type: string; expected?: any; actual?: any; message?: string }>
  ): this {
    // Store the assertion function - it will be evaluated during execution
    // For now, we'll store a placeholder that indicates this is an assertion node
    const assertionNode: AssertionNode = {
      id,
      type: 'assertion',
      assertions: [], // Will be populated during execution
    };
    this.nodes.push(assertionNode);
    return this;
  }

  addEdge(from: string, to: string): this {
    this.edges.push({ from, to });
    return this;
  }

  create(options: { frequency?: Frequency }): TestPlan {
    const plan: TestPlan = {
      name: this.config.name,
      endpoint_host: this.config.endpoint_host,
      frequency: options.frequency,
      nodes: this.nodes,
      edges: this.edges,
    };

    // Output JSON (in a real implementation, this would be written to a file or returned)
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }

  toJSON(): string {
    const plan: TestPlan = {
      name: this.config.name,
      endpoint_host: this.config.endpoint_host,
      nodes: this.nodes,
      edges: this.edges,
    };
    return JSON.stringify(plan, null, 2);
  }
}
