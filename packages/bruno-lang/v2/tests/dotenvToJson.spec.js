const parser = require('../src/dotenvToJson');

describe('DotEnv File Parser', () => {
  test('it should parse a simple key-value pair', () => {
    const input = `FOO=bar`;
    const expected = { default: { FOO: 'bar' }, envs: {} };
    const output = parser(input);
    expect(output).toEqual(expected);
  });

  test('it should parse a simple key-value pair with empty lines', () => {
    const input = `
FOO=bar

`;
    const expected = { default: { FOO: 'bar' }, envs: {} };
    const output = parser(input);
    expect(output).toEqual(expected);
  });

  test('it should parse multiple key-value pairs', () => {
    const input = `
FOO=bar
BAZ=2
BEEP=false
`;
    const expected = {
      default: {
        FOO: 'bar',
        BAZ: '2',
        BEEP: 'false'
      },
      envs: {}
    };
    const output = parser(input);
    expect(output).toEqual(expected);
  });

  test('it should not strip leading and trailing whitespace when using quotes', () => {
    const input = `
SPACE="  value  "
`;
    const expected = { default: { SPACE: '  value  ' }, envs: {} };
    const output = parser(input);
    expect(output).toEqual(expected);
  });

  test('it should strip leading and trailing whitespace when NOT using quotes', () => {
    const input = `
SPACE=  value  
`;
    const expected = { default: { SPACE: 'value' }, envs: {} };
    const output = parser(input);
    expect(output).toEqual(expected);
  });

  test('it should parse environment specific variables', () => {
    const input = `dev.API_URL=http://dev\nprod.API_URL=http://prod`;
    const expected = {
      default: {},
      envs: {
        dev: { API_URL: 'http://dev' },
        prod: { API_URL: 'http://prod' }
      }
    };
    const output = parser(input);
    expect(output).toEqual(expected);
  });
});
