const dotenv = require('dotenv');

const parser = (input) => {
  const buf = Buffer.from(input);
  const parsed = dotenv.parse(buf);

  const result = { default: {}, envs: {} };

  Object.entries(parsed).forEach(([key, value]) => {
    const match = key.match(/^(.*?)\.(.+)$/);
    if (match) {
      const env = match[1];
      const varName = match[2];
      if (!result.envs[env]) {
        result.envs[env] = {};
      }
      result.envs[env][varName] = value;
    } else {
      result.default[key] = value;
    }
  });

  return result;
};

module.exports = parser;
