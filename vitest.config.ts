import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Spinning up a MongoDB container takes a while on a cold image pull, so the
    // hooks that own the container lifecycle need generous breathing room.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // Integration tests share a single Mongo container and mutate collections,
    // so they must not run concurrently with each other.
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
  },
});
