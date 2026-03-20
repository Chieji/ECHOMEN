/**
 * Service Registry & Discovery
 * Enables microservices architecture with dynamic service registration
 */

export interface ServiceConfig {
  name: string;
  version: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc';
  healthCheck?: {
    path: string;
    interval: number;
    timeout: number;
  };
  metadata?: Record<string, any>;
}

export interface ServiceInstance {
  id: string;
  config: ServiceConfig;
  registeredAt: number;
  lastHeartbeat: number;
  healthy: boolean;
}

class ServiceRegistry {
  private services: Map<string, ServiceInstance[]> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register a service instance
   */
  register(config: ServiceConfig): ServiceInstance {
    const id = `${config.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const instance: ServiceInstance = {
      id,
      config,
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
      healthy: true,
    };

    if (!this.services.has(config.name)) {
      this.services.set(config.name, []);
    }

    this.services.get(config.name)!.push(instance);

    // Start health checks if configured
    if (config.healthCheck) {
      this.startHealthCheck(instance);
    }

    console.log(`✓ Registered service: ${config.name}@${id}`);

    return instance;
  }

  /**
   * Deregister a service instance
   */
  deregister(serviceName: string, instanceId: string): void {
    const instances = this.services.get(serviceName);

    if (!instances) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    const index = instances.findIndex((i) => i.id === instanceId);

    if (index === -1) {
      throw new Error(`Service instance not found: ${instanceId}`);
    }

    // Stop health checks
    const healthCheckKey = `${serviceName}:${instanceId}`;
    const interval = this.healthCheckIntervals.get(healthCheckKey);

    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(healthCheckKey);
    }

    instances.splice(index, 1);

    if (instances.length === 0) {
      this.services.delete(serviceName);
    }

    console.log(`✓ Deregistered service: ${serviceName}@${instanceId}`);
  }

  /**
   * Get all instances of a service
   */
  getInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName) || [];
  }

  /**
   * Get healthy instances of a service
   */
  getHealthyInstances(serviceName: string): ServiceInstance[] {
    return this.getInstances(serviceName).filter((i) => i.healthy);
  }

  /**
   * Get a random healthy instance (load balancing)
   */
  getInstance(serviceName: string): ServiceInstance | null {
    const healthy = this.getHealthyInstances(serviceName);

    if (healthy.length === 0) {
      return null;
    }

    return healthy[Math.floor(Math.random() * healthy.length)];
  }

  /**
   * Get service URL
   */
  getServiceUrl(serviceName: string): string | null {
    const instance = this.getInstance(serviceName);

    if (!instance) {
      return null;
    }

    const { protocol, host, port } = instance.config;
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Start health checks for a service instance
   */
  private startHealthCheck(instance: ServiceInstance): void {
    const config = instance.config;

    if (!config.healthCheck) {
      return;
    }

    const key = `${config.name}:${instance.id}`;
    const interval = setInterval(async () => {
      try {
        const url = `${config.protocol}://${config.host}:${config.port}${config.healthCheck!.path}`;
        const response = await fetch(url, {
          timeout: config.healthCheck!.timeout,
        });

        instance.healthy = response.ok;
        instance.lastHeartbeat = Date.now();
      } catch (error) {
        instance.healthy = false;
        instance.lastHeartbeat = Date.now();
      }
    }, config.healthCheck.interval);

    this.healthCheckIntervals.set(key, interval);
  }

  /**
   * Get all registered services
   */
  getAllServices(): Record<string, ServiceInstance[]> {
    const result: Record<string, ServiceInstance[]> = {};

    for (const [name, instances] of this.services) {
      result[name] = instances;
    }

    return result;
  }

  /**
   * Get service statistics
   */
  getStats(serviceName: string): {
    total: number;
    healthy: number;
    unhealthy: number;
  } {
    const instances = this.getInstances(serviceName);
    const healthy = instances.filter((i) => i.healthy).length;

    return {
      total: instances.length,
      healthy,
      unhealthy: instances.length - healthy,
    };
  }

  /**
   * Clear all services
   */
  clear(): void {
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }

    this.services.clear();
    this.healthCheckIntervals.clear();
  }
}

export const serviceRegistry = new ServiceRegistry();

/**
 * Service Client for inter-service communication
 */
export class ServiceClient {
  constructor(private serviceName: string) {}

  async call<T>(method: string, ...args: any[]): Promise<T> {
    const instance = serviceRegistry.getInstance(this.serviceName);

    if (!instance) {
      throw new Error(`No healthy instances of service: ${this.serviceName}`);
    }

    const url = `${instance.config.protocol}://${instance.config.host}:${instance.config.port}`;

    const response = await fetch(`${url}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args }),
    });

    if (!response.ok) {
      throw new Error(`Service call failed: ${response.statusText}`);
    }

    return response.json();
  }
}
