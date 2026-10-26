const configs = {
  'sanity_check': {
    stages: [
      { duration: '10s', target: 1 },
      { duration: '10s', target: 2 },
      { duration: '10s', target: 3 },
      { duration: '20s', target: 0 }
    ],
    thresholds: {
      http_req_duration: ['p(95)<1500', 'p(99)<2500', 'max<3000'],
      http_req_waiting: ['p(95)<400'],
      http_req_failed: ['rate<0.01'],
    }
  },

  // 54 users over a 1 hour period
  'baseline': {
    stages: [
      { duration: '5m', target: 10 },
      { duration: '10m', target: 54 },
      { duration: '35m', target: 54 },
      { duration: '10m', target: 0 }
    ],
    thresholds: {
      http_req_duration: ['p(95)<1500', 'p(99)<2500', 'max<3000'],
      http_req_waiting: ['p(95)<400'],
      http_req_failed: ['rate<0.05'],
    }
  },

  '2x_baseline': {
    stages: [
      { duration: '5m', target: 20 },
      { duration: '10m', target: 108 },
      { duration: '35m', target: 108 },
      { duration: '10m', target: 0 }
    ],
    thresholds: {
      http_req_duration: ['p(95)<1500', 'p(99)<2500', 'max<3000'],
      http_req_waiting: ['p(95)<400'],
      http_req_failed: ['rate<0.05'],
    }
  },

  '3x_baseline': {
    stages: [
      { duration: '5m', target: 30 },
      { duration: '10m', target: 162 },
      { duration: '35m', target: 162 },
      { duration: '10m', target: 0 }
    ],
    thresholds: {
      http_req_duration: ['p(95)<1500', 'p(99)<2500', 'max<3000'],
      http_req_waiting: ['p(95)<400'],
      http_req_failed: ['rate<0.01'],
    }
  }
};



const configName = __ENV.CONFIG || 'sanity_check';

if (!configs[configName]) {
  throw new Error(`Config '${configName}' not found. Available configs: ${Object.keys(configs).join(', ')}`);
}

console.log(`Running with config: 🔍${configName}`);

export const options = configs[configName];
