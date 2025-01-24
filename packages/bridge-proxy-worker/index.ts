process.on('SIGINT', () => {
  process.exit(0);
});

declare namespace NodeJS {
  interface ProcessEnv {
    TARGET_SERVER_HOST?: string;
    BRIDGE_PROXY_CONNECTOR_HOST?: string;
    WORK_TIMEOUT?: string;
  }
}

const timeout = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));

type RequestObject = Omit<Request, 'text'> & { text: string };
type ResponseObject = Omit<Response, 'text'> & { text: string };

const work = async (serverHost: string, connectorHost: string) => {
  console.log('* start work');
  const connectorResponse = await fetch(connectorHost);
  console.log(`* connector response status: ${connectorResponse.status}`);
  console.log(`* connector response statusText: ${connectorResponse.statusText}`);
  if (connectorResponse.status === 204) {
    return;
  }
  const requestData: { key?: `request:${string}`; requestObject?: RequestObject } = await connectorResponse.json();
  if (!('key' in requestData)) {
    console.log(`- 'key' not found`);
    return;
  }
  if (!requestData.key) {
    console.log(`- 'key' not found`);
    return;
  }
  if (!('requestObject' in requestData)) {
    console.log(`- 'requestObject' not found`);
    return;
  }
  if (!requestData.requestObject) {
    console.log(`- 'requestObject' not found`);
    return;
  }
  const [serverHostname, serverPort] = serverHost.split(':');
  const url = new URL(requestData.requestObject.url);
  url.protocol = 'http:';
  url.hostname = serverHostname;
  if (serverPort) {
    url.port = serverPort;
  }
  console.log(`* request url: ${url.toString()}`);
  console.log(`* request method: ${requestData.requestObject.method}`);
  console.log(`* request headers: ${JSON.stringify(requestData.requestObject.headers, null, 2)}`);
  console.log(`* request body: ${requestData.requestObject.text}`);
  const serverResponse = await fetch(url, {
    method: requestData.requestObject.method,
    headers: requestData.requestObject.headers,
    body: ['HEAD', 'GET'].includes(requestData.requestObject.method) ? undefined : requestData.requestObject.text,
  });
  console.log(`* server response status: ${connectorResponse.status}`);
  console.log(`* server response statusText: ${connectorResponse.statusText}`);
  console.log(
    `* server response headers: ${JSON.stringify(Object.fromEntries([...serverResponse.headers.entries()]), null, 2)}`,
  );
  const key = `response:${requestData.key.replace(/^request:/, '')}` as const;
  const status = serverResponse.status;
  const statusText = serverResponse.statusText;
  const headers = Object.fromEntries([...serverResponse.headers.entries()]);
  const text = await serverResponse.text();
  const responseObject = { status, statusText, headers, text };
  const object = { key, responseObject };
  await fetch(connectorHost, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(object),
  });
  console.log('* end work');
};

Promise.resolve().then(async () => {
  if (!('TARGET_SERVER_HOST' in process.env)) {
    throw Error(`'TARGET_SERVER_HOST' is not defined.`);
  }
  if (!process.env.TARGET_SERVER_HOST) {
    throw Error(`'TARGET_SERVER_HOST' is not defined.`);
  }
  if (!('BRIDGE_PROXY_CONNECTOR_HOST' in process.env)) {
    throw Error(`'BRIDGE_PROXY_CONNECTOR_HOST' is not defined.`);
  }
  if (!process.env.BRIDGE_PROXY_CONNECTOR_HOST) {
    throw Error(`'BRIDGE_PROXY_CONNECTOR_HOST' is not defined.`);
  }
  if (!('WORK_TIMEOUT' in process.env)) {
    throw Error(`'WORK_TIMEOUT' is not defined.`);
  }
  if (!process.env.WORK_TIMEOUT) {
    throw Error(`'WORK_TIMEOUT' is not defined.`);
  }
  console.log(`* target server host: ${process.env.TARGET_SERVER_HOST}`);
  console.log(`* bridge proxy connector host: ${process.env.BRIDGE_PROXY_CONNECTOR_HOST}`);
  console.log(`* work timeout: ${process.env.WORK_TIMEOUT}`);
  const workTimeout = isNaN(parseInt(process.env.WORK_TIMEOUT)) ? 60 * 1000 : parseInt(process.env.WORK_TIMEOUT);
  console.log(`* work timeout: ${workTimeout}`);
  while (true) {
    await work(process.env.TARGET_SERVER_HOST, process.env.BRIDGE_PROXY_CONNECTOR_HOST);
    await timeout(workTimeout);
  }
});
