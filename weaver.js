/*
    Weaver JavaScript Library v 0.3.0
    Copyright (C) 2025 Modula.dev

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = {
    listen,
    respond,
    router,
    routeMatch,
    routeUri,
    routeQueryObject,
    routeMethod,
    routeHoneypot,
    pushHoneypot,
    serveFile,
    serveRedirect,
    serveError,
    hashId
};

const fs = require('fs');
const http = require('http');

// ================================================== Weaver Core Functionality

var router_function = undefined;
function router (func) { router_function = func; }

function respond (handler, response) {
    handler.writeHead(response.code, {'Content-Type': response.mime});
    handler.end(response.body);
}

function listen (port) {
    const service = http.createServer(function(request, handler) {
        if (router_function == undefined) {
            error(`fatal error, weaver.router has not been initialized`);
            respond(handler, serveError(500, "")); }
        router_function(request, handler);
        });
    service.listen(port);
}

function error(text){
    console.error(text);
	fs.appendFileSync('error.log', text+'\n')
	process.exit(1)
}

function warn(text){
    console.error(text);
	fs.appendFileSync('error.log', text+'\n')
}

// ================================================== Weaver Routing Functions
function hashId(request) {
    try { ip =  request.headers['x-forwarded-for'].split(',')[0]} catch(err) { warn('request missing source IP address'); return undefined; }
	try { user =  request.headers['user-agent']} catch(err) { warn('request missing user-agent'); return undefined; }
	try { url =  request.url } catch(err) { warn('request missing url header'); return undefined; }
	try { method =  request.method } catch(err) { warn('request missing method header'); return undefined; }
	var string = ip + user; var roll = 0; var len=string.length; var sum=0;
    for(let i=0; i<string.length;i++){  sum += string.charCodeAt(i) }
    roll = sum % 256
    return parseInt(''+roll+len+sum)
}

function routeUri(request) {
    const uri = request.url;
    const a = uri.split("?");
    return decodeURIComponent(a[0]);
}

function routeMethod(request) {
    return request.method;
}

function routeQueryObject(request) {
    const object = {};
    const query = ((request.url.split("?")).slice(1).join(""));
    const entries = query.split("&");
    for (const entry of entries) {
        const [key, value] = entry.split("=");
        if (!key) { continue; } object[decodeURIComponent(key)] = decodeURIComponent(value);
    }   return object;
}

function routeMatch(request, regArray, flags) {
    const uri = routeUri(request);
    for(let i=0; i<regArray.length; i++) {
        const test = new RegExp(regArray[i], flags);
        if (test.test(uri)) { return i; }
    } return -1;
}

const honeypots = [
    "^(https?:\/\/)?[^\/]*\/wp-.*",
    "^(https?:\/\/)?[^\/]*\/\.?[Aa][Ww][Ss]_?.*"
];
function pushHoneypot(regex) { honeypots.push(regex); }
function routeHoneypot(request) {
    if ( routeMatch(request, honeypots) != -1 ) { return serveError(404, request.url); }
    else { return undefined; }
}

// ================================================== Weaver Include Functions
function serveFile(mime, path) {
    try { return {
        code: 200,
        mime: mime,
        body: fs.readFileSync(path) // {encoding: "utf-8"}
    }}
    catch(err) {
        error(`cannot serve missing file ${path}`);
        return { code: 404, mime: "text/raw", body: `HTTP 404: told to serve file ${path}, file does not exist` }
    }
}

function serveRedirect(path) {
    return {
        code: 303,
        mime: "text/html",
        body: `<script>function redirect() { window.location.replace("${path}"); }</script><body onload="redirect()">HTTP 303: <a href="${path}">Click here if not automatically redirected</a></body>`
    }
}

function serveError(code, path) {
    return { code: code, mime: "text/raw", body: `HTTP ${code}: uri ${path} ${errorDescription[code]}` }
}