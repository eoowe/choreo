const express = require("express");
const app = express();
const { exec, execSync } = require('child_process');
const PORT = process.env.SERVER_PORT || process.env.PORT || 8080;        
const UUID = process.env.UUID || '88888888-8888-8888-8888-888888888888'; //若需要改UUID，需要在config.json里第14,48,65,95行改为一致
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nezha.ggff.net:8008'; // 哪吒v1填写形式：nezha.xxx.com:8008 哪吒v填写形式：nezha.xxx.com 
const NEZHA_PORT = process.env.NEZHA_PORT || '';     // 哪吒v1请留空 哪吒v0端口为{443,8443,2096,2087,2083,2053}其中之一开启tls
const NEZHA_KEY = process.env.NEZHA_KEY || 'nezha123@';       // 哪吒v1的NZ_CLIENT_SECRET或哪吒v0的agent密钥
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || 'choreo.nnuu.nyc.mn ';   // argo隧道域名必填
const ARGO_AUTH = process.env.ARGO_AUTH || 'eyJhIjoiOGI5NzI0MDgwZTU1ZTcwMzcwZmI3NDI4NzkyMmYzMWIiLCJ0IjoiNGMxZjI1OTAtNWNiMy00NmYxLThlOWItOTNkMjYwODMwNWVmIiwicyI6IlptTXhPVEEwTW1JdE56Z3lNUzAwTXpNMUxUazNOemt0WWprMVpqazJNak15TW1KaSJ9';       // argo隧道token必填，并cf后台设置端口为8001
const CFIP = process.env.CFIP || 'ip.sb'; 
const NAME = process.env.NAME || 'Choreo';

// root route
app.get("/", function(req, res) {
  res.send("Hello world!");
});

const metaInfo = execSync(
  'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
  { encoding: 'utf-8' }
);
const ISP = metaInfo.trim();

// sub subscription
app.get('/sub', (req, res) => {
  const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: '443', id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: ARGO_DOMAIN, path: '/vmess-argo?ed=2560', tls: 'tls', sni: ARGO_DOMAIN, alpn: '', fp: 'chrome' };
  const vlessURL = `vless://${UUID}@${CFIP}:443?encryption=none&security=tls&sni=${ARGO_DOMAIN}&fp=chrome&type=ws&host=${ARGO_DOMAIN}&path=%2Fvless-argo%3Fed%3D2560#${NAME}-${ISP}`;
  const vmessURL = `vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
  const trojanURL = `trojan://${UUID}@${CFIP}:443?security=tls&sni=${ARGO_DOMAIN}&fp=chrome&type=ws&host=${ARGO_DOMAIN}&path=%2Ftrojan-argo%3Fed%3D2560#${NAME}-${ISP}`;
  
  const base64Content = Buffer.from(`${vlessURL}\n\n${vmessURL}\n\n${trojanURL}`).toString('base64');

  res.type('text/plain; charset=utf-8').send(base64Content);
});

// run-nezha
let command = '';
let tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
  
if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
    // 检测哪吒v0是否开启TLS
    const NEZHA_TLS = tlsPorts.includes(NEZHA_PORT) ? '--tls' : '';
    const command = `nohup ./swith -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &`;
  } else if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
      command = `nohup ./v1 -c config.yaml >/dev/null 2>&1 &`;
  } else {
    console.log('NEZHA variable is empty, skip running');
    setTimeout(() => {
      runWeb();
    }, 2000);
  }

  try {
    exec(command, { shell: '/bin/bash' }, (err) => {
      if (err) console.error('npm running error:', err);
      else console.log('npm is running');
        setTimeout(() => {
        runWeb();
      }, 2000);
    });
  } catch (error) {
    console.error(`error: ${error}`);
  } 
};

// run-xr-ay
function runWeb() {
  const command1 = `nohup ./web -c ./config.json >/dev/null 2>&1 &`;
  exec(command1, (error) => {
    if (error) {
      console.error(`web running error: ${error}`);
    } else {
      console.log('web is running');

      setTimeout(() => {
        runServer();
      }, 2000);
    }
  });
}

// run-server
function runServer() {
  let command2 = '';
  if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
    command2 = `nohup ./server tunnel --region us --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &`;
  } else {
    command2 = `nohup ./server tunnel --region us --edge-ip-version auto --config tunnel.yml run >/dev/null 2>&1 &`;
  }

  exec(command2, (error) => {
    if (error) {
      console.error(`server running error: ${error}`);
    } else {
      console.log('server is running');
    }
  });
}

app.listen(PORT, () => console.log(`App is listening on port ${PORT}!`));
