/**
 * Performance Benchmarks for ECHOMEN
 * Tests caching, message queue, and service performance
 */

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

class Benchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark test
   */
  async run(
    name: string,
    fn: () => Promise<void>,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < 10; i++) {
      await fn();
    }

    // Actual benchmark
    const startTotal = Date.now();

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      const end = Date.now();
      times.push(end - start);
    }

    const totalTime = Date.now() - startTotal;

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      avgTime: totalTime / iterations,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      opsPerSecond: (iterations / totalTime) * 1000,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Print benchmark results
   */
  printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(80));

    for (const result of this.results) {
      console.log(`\n${result.name}`);
      console.log('-'.repeat(40));
      console.log(`  Iterations:      ${result.iterations}`);
      console.log(`  Total Time:      ${result.totalTime}ms`);
      console.log(`  Avg Time:        ${result.avgTime.toFixed(3)}ms`);
      console.log(`  Min Time:        ${result.minTime}ms`);
      console.log(`  Max Time:        ${result.maxTime}ms`);
      console.log(`  Ops/Second:      ${result.opsPerSecond.toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Compare results
   */
  compare(name1: string, name2: string): void {
    const result1 = this.results.find((r) => r.name === name1);
    const result2 = this.results.find((r) => r.name === name2);

    if (!result1 || !result2) {
      console.error('Results not found for comparison');
      return;
    }

    const improvement = ((result1.avgTime - result2.avgTime) / result1.avgTime) * 100;

    console.log(`\n${name1} vs ${name2}`);
    console.log('-'.repeat(40));
    console.log(`  ${name1} avg: ${result1.avgTime.toFixed(3)}ms`);
    console.log(`  ${name2} avg: ${result2.avgTime.toFixed(3)}ms`);
    console.log(
      `  ${improvement > 0 ? name2 : name1} is ${Math.abs(improvement).toFixed(1)}% faster`
    );
  }
}

/**
 * Cache Performance Benchmarks
 */
async function benchmarkCache() {
  const benchmark = new Benchmark();

  // Simulate cache operations
  const cacheData: Record<string, any> = {};

  // Benchmark: Cache write
  await benchmark.run('Cache Write', async () => {
    const key = `key-${Math.random()}`;
    cacheData[key] = { data: 'test', timestamp: Date.now() };
  });

  // Benchmark: Cache read (hit)
  const testKey = 'test-key';
  cacheData[testKey] = { data: 'test', timestamp: Date.now() };

  await benchmark.run('Cache Read (Hit)', async () => {
    const _value = cacheData[testKey];
    if (!value) throw new Error('Cache miss');
  });

  // Benchmark: Cache read (miss)
  await benchmark.run('Cache Read (Miss)', async () => {
    const _value = cacheData['non-existent-key'];
    // Miss is expected
  });

  // Benchmark: Cache with TTL check
  await benchmark.run('Cache with TTL Check', async () => {
    const key = `ttl-key-${Math.random()}`;
    const entry = {
      data: 'test',
      expiresAt: Date.now() + 60000,
    };
    cacheData[key] = entry;

    if (entry.expiresAt < Date.now()) {
      delete cacheData[key];
    }
  });

  benchmark.printResults();
}

/**
 * Message Queue Performance Benchmarks
 */
async function benchmarkMessageQueue() {
  const benchmark = new Benchmark();

  const queue: any[] = [];

  // Benchmark: Enqueue message
  await benchmark.run('Message Enqueue', async () => {
    const _message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type: 'test',
      payload: { data: 'test' },
      timestamp: Date.now(),
    };
    queue.push(message);
  });

  // Benchmark: Dequeue message
  await benchmark.run('Message Dequeue', async () => {
    if (queue.length > 0) {
      queue.shift();
    }
  });

  // Benchmark: Process message (with handler)
  await benchmark.run('Message Processing', async () => {
    const _message = {
      id: `msg-${Date.now()}`,
      type: 'test',
      payload: { data: 'test' },
    };

    // Simulate handler execution
    await new Promise((resolve) => {
      setImmediate(() => {
        // Handler logic
        resolve(null);
      });
    });
  });

  // Benchmark: Priority queue insertion
  await benchmark.run('Priority Queue Insert', async () => {
    const _message = {
      id: `msg-${Date.now()}`,
      priority: Math.random() > 0.5 ? 'high' : 'low',
      payload: { data: 'test' },
    };

    // Insert by priority
    const priorityOrder: Record<string, number> = { high: 0, low: 1 };
    let inserted = false;

    for (let i = 0; i < queue.length; i++) {
      if (priorityOrder[message.priority] < priorityOrder[queue[i].priority]) {
        queue.splice(i, 0, message);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      queue.push(message);
    }
  });

  benchmark.printResults();
}

/**
 * Service Registry Performance Benchmarks
 */
async function benchmarkServiceRegistry() {
  const benchmark = new Benchmark();

  const services: Record<string, any[]> = {};

  // Benchmark: Register service
  await benchmark.run('Service Registration', async () => {
    const serviceName = 'test-service';
    if (!services[serviceName]) {
      services[serviceName] = [];
    }

    services[serviceName].push({
      id: `instance-${Date.now()}`,
      host: 'localhost',
      port: 3000,
      healthy: true,
    });
  });

  // Benchmark: Get service instance
  services['test-service'] = [
    { id: 'inst1', healthy: true },
    { id: 'inst2', healthy: true },
    { id: 'inst3', healthy: false },
  ];

  await benchmark.run('Get Service Instance', async () => {
    const instances = services['test-service'].filter((i) => i.healthy);
    if (instances.length > 0) {
      const _instance = instances[Math.floor(Math.random() * instances.length)];
      // Use instance
    }
  });

  // Benchmark: Health check
  await benchmark.run('Health Check', async () => {
    const instance = services['test-service'][0];
    // Simulate health check
    instance.healthy = Math.random() > 0.1; // 90% healthy
  });

  benchmark.printResults();
}

/**
 * Rate Limiter Performance Benchmarks
 */
async function benchmarkRateLimiter() {
  const benchmark = new Benchmark();

  const store: Record<string, { count: number; resetTime: number }> = {};

  // Benchmark: Check rate limit
  await benchmark.run('Rate Limit Check', async () => {
    const key = '127.0.0.1';
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = { count: 0, resetTime: now + 60000 };
    }

    store[key].count++;

    if (store[key].count > 100) {
      // Rate limited
    }
  });

  // Benchmark: Rate limit with cleanup
  await benchmark.run('Rate Limit with Cleanup', async () => {
    const key = '127.0.0.1';
    const now = Date.now();

    // Cleanup
    for (const k in store) {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    }

    if (!store[key] || store[key].resetTime < now) {
      store[key] = { count: 0, resetTime: now + 60000 };
    }

    store[key].count++;
  });

  benchmark.printResults();
}

/**
 * Run all benchmarks
 */
async function runAllBenchmarks() {
  console.log('\n🚀 Starting Performance Benchmarks...\n');

  console.log('📊 Cache Performance');
  await benchmarkCache();

  console.log('\n📊 Message Queue Performance');
  await benchmarkMessageQueue();

  console.log('\n📊 Service Registry Performance');
  await benchmarkServiceRegistry();

  console.log('\n📊 Rate Limiter Performance');
  await benchmarkRateLimiter();

  console.log('\n✅ All benchmarks completed!');
}

// Run benchmarks if executed directly
if (require.main === module) {
  runAllBenchmarks().catch(console.error);
}

export { Benchmark, runAllBenchmarks };
