import { describe, it, expect, beforeEach } from 'bun:test';
import { WaitGroup } from '../src/waitgroup.js';

describe('WaitGroup', () => {
  let wg: WaitGroup;

  beforeEach(() => {
    wg = new WaitGroup();
  });

  it('should initialize with zero counter', () => {
    expect(wg.counter).toBe(0);
  });

  it('should wait immediately when counter is zero', async () => {
    const start = Date.now();
    await wg.wait();
    const elapsed = Date.now() - start;
    
    // Should return immediately (within a few milliseconds)
    expect(elapsed).toBeLessThan(50);
  });

  it('should handle add and done correctly', async () => {
    wg.add(2);
    expect(wg.counter).toBe(2);
    
    wg.done();
    expect(wg.counter).toBe(1);
    
    wg.done();
    expect(wg.counter).toBe(0);
  });

  it('should throw error on negative counter', () => {
    expect(() => wg.add(-1)).toThrow('WaitGroup: negative counter');
  });

  it('should wait for all operations to complete', async () => {
    const results: number[] = [];
    wg.add(3);
    
    // Start three async operations
    const op1 = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      results.push(1);
      wg.done();
    };
    
    const op2 = async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      results.push(2);
      wg.done();
    };
    
    const op3 = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      results.push(3);
      wg.done();
    };
    
    // Start operations
    op1();
    op2();
    op3();
    
    // Wait should block until all are done
    await wg.wait();
    
    expect(results).toHaveLength(3);
    expect(new Set(results)).toEqual(new Set([1, 2, 3]));
    expect(wg.counter).toBe(0);
  });

  it('should handle multiple waiters', async () => {
    wg.add(1);
    
    const waiters: Promise<void>[] = [];
    const completions: number[] = [];
    
    // Create multiple waiters
    for (let i = 0; i < 3; i++) {
      waiters.push(
        (async (id: number) => {
          await wg.wait();
          completions.push(id);
        })(i)
      );
    }
    
    // Let waiters start
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Complete the work
    wg.done();
    
    // All waiters should complete
    await Promise.all(waiters);
    
    expect(completions).toHaveLength(3);
    expect(new Set(completions)).toEqual(new Set([0, 1, 2]));
  });

  it('should handle complex workflow', async () => {
    const results: string[] = [];
    
    // Simulate a complex workflow with multiple stages
    wg.add(2);
    
    // Stage 1: Two parallel operations
    const stage1Op1 = async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      results.push('stage1-op1');
      wg.done();
    };
    
    const stage1Op2 = async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      results.push('stage1-op2');
      wg.done();
    };
    
    stage1Op1();
    stage1Op2();
    
    // Wait for stage 1 to complete
    await wg.wait();
    
    // Stage 2: Single operation after stage 1
    wg.add(1);
    const stage2Op = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      results.push('stage2-op');
      wg.done();
    };
    
    stage2Op();
    await wg.wait();
    
    expect(results).toContain('stage1-op1');
    expect(results).toContain('stage1-op2');
    expect(results).toContain('stage2-op');
    expect(results.indexOf('stage2-op')).toBeGreaterThan(Math.max(
      results.indexOf('stage1-op1'),
      results.indexOf('stage1-op2')
    ));
  });
});