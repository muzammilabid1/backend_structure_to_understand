const configs = {
    'sanity_check': {
      stages: [
        { duration: '10m', target: 20 },
        { duration: '10m', target: 20 },
        { duration: '10m', target: 10 },
        { duration: '5m', target: 0 }
      ],
      thresholds: {
        http_req_duration: ['p(95)<1500', 'p(99)<2500', 'max<3000'],
        http_req_waiting: ['p(95)<400'],
        http_req_failed: ['rate<0.01'],
      }
    },

    'baseline': {
      stages: [
        { duration: '10m', target: 40 },
        { duration: '40m', target: 40 },
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
        { duration: '15m', target: 80 },
        { duration: '30m', target: 80 },
        { duration: '15m', target: 0 }
      ],
      thresholds: {
        http_req_duration: ['p(95)<1500', 'p(99)<2500', 'max<3000'],
        http_req_waiting: ['p(95)<400'],
        http_req_failed: ['rate<0.05'],
      }
    },

    '3x_baseline': {
      stages: [
        { duration: '20m', target: 120 },
        { duration: '20m', target: 120 },
        { duration: '20m', target: 0 }
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