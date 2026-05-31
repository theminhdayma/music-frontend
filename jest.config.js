/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Cấp đường dẫn thư mục gốc của Next.js app để tải .env
  dir: './',
});

// Thêm cấu hình tùy chỉnh
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// Khởi tạo cấu hình Jest cho Next.js
module.exports = createJestConfig(customJestConfig);
