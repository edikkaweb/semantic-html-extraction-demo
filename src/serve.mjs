import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {root} from './import.mjs';
const port=Number(process.env.PORT||4180), prefix='/semantic-html-extraction-demo/';
const mime={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/plain; charset=utf-8','.py':'text/plain; charset=utf-8','.svg':'image/svg+xml','.zip':'application/zip'};
http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(url==='/'){res.writeHead(302,{Location:prefix}).end();return;}
 if(!url.startsWith(prefix)){res.writeHead(404).end();return;}
 const file=path.resolve(root,'dist',url.slice(prefix.length)+(url.endsWith('/')?'index.html':''));
 if(!file.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403).end();return;}
 try{const content=fs.readFileSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(content);}catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(root,'dist/404.html')));}
}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}${prefix}`));
