process.on('SIGINT', () => {
  process.exit(0);
});

declare namespace NodeJS {
  interface ProcessEnv {
    TARGET_SERVER_HOST?: string;
    BRIDGE_PROXY_CONNECTOR_HOST?: string;
  }
}

const timeout = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));

type RequestObject = Omit<Request, 'text'> & { text: string };
type ResponseObject = Omit<Response, 'text'> & { text: string };

const work = async (serverHost: string, connectorHost: string) => {
  console.log('* start work');
  const connectorResponse = await fetch(connectorHost);
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
  url.hostname = serverHostname;
  if (serverPort) {
    url.port = serverPort;
  }
  const serverResponse = await fetch(url, {
    headers: requestData.requestObject.headers,
    body: requestData.requestObject.text,
  });
  const status = serverResponse.status;
  const statusText = serverResponse.statusText;
  const headers = Object.fromEntries([...serverResponse.headers.entries()]);
  const text = await serverResponse.text();
  const object = { status, statusText, headers, text };
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
  while (true) {
    await work(process.env.TARGET_SERVER_HOST, process.env.BRIDGE_PROXY_CONNECTOR_HOST);
    // await timeout(1000 / 6);
    await timeout(10000);
  }
});
