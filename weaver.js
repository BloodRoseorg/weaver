/*
    Weaver JavaScript Library v 0.5.1
    Copyright (C) 2026 BloodRose.org

Redistribution and use in source and binary forms,
with or without modification,
are permitted provided that the following conditions are met:

1. Redistribution of source code must retain
the above copyright notice, this list of conditions, and the following disclaimer.

2. Redistribution in binary form must reproduce
the above copyright notice, this list of conditions, and the following disclaimer
in the documentation and/or other materials provided with the distribution.

3. This license does not grant the right to sell the software.
"Sell" means practicing any or all of the rights granted by this license
to provide a product or service to third parties for a fee or other consideration
(including, without limitation, fees for hosting, consulting, or support services),
where the product or service derives substantially or wholly from the software.

4. Neither the name of the licensor nor the names of
the software's contributors may be used to endorse or promote products
derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO event_t SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE

PATCH NOTES

    0.5.1       patch for replaceAll error
    0.5.0       fix serveError, routeQueryObject, add error codes
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

const replaceAll = (string, sub, rpl) => {
    return string.split(sub).join(rpl);
}

function respond (handler, response) {
    handler.writeHead(response.code, {'Content-Type': response.mime});
    handler.end(response.body);
}

function listen (port) {
    const service = http.createServer(function(request, handler) {
        if (router_function == undefined) {
            error(`fatal error, weaver.router has not been initialized`);
            respond(handler, serveError(500, "")); }
        request['id'] = hashId(request); if (hashId === undefined) { respond(handler, serveError(400, 'MALFORMATED HTTP REQUEST')) }
        else { router_function(request, handler) }
        });
    service.listen(port);
}

function error(text){
    // console.error(text);
	fs.appendFileSync('error.log', text+'\n')
	process.exit(1)
}

function warn(text){
    // console.error(text);
	fs.appendFileSync('error.log', text+'\n')
}

// ================================================== Weaver Routing Functions
function hashId(request) {
    try { request.domain = request.headers['x-forwarded-host'] || request.headers.host?.split(':')[0]; } catch(err) { warn('request missing host target'); return undefined; }
    try { ip =  request.headers['x-forwarded-for'].split(',')[0]} catch(err) { warn('request missing source IP address'); ip = '<NOIP>' }
	try { user =  request.headers['user-agent']} catch(err) { warn('request missing user-agent'); user = '<NOUSER>' }
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
        if (!key) { continue; } object[decodeURIComponent(key)] = replaceAll( (decodeURIComponent(value)), '+', ' ');
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
    var message = errorDescription[code]; if ( message == undefined ) { message = "Undefined error type"; }
    return { code: code, mime: "text/raw", body: `HTTP ${code}: uri ${path}\n${message}` }
}

errorDescription = {
    400:    "Malformatted Request",
    401:    "Unauthorized Request",
    402:    "Payment Required",
    403:    "Forbidden",
    404:    "Resource Not found",
    405:    "Method Not Allowed",
    406:    "Enpoint Not Acceptable",
    407:    "Proxy Authentication Required",
    408:    "Request Timeout",
    409:    "Resource Conflict",
    410:    "Permanently Removed",
    411:    "Length Required",
    412:    "Precondition Failed",
    413:    "Payload Too Large",
    414:    "URI Too Long",
    415:    "Unsupported Media Type",
    416:    "Range Not Satisfiable",
    417:    "Expectation Failed",
    418:    "I am a teapot",
    421:    "Misdirected Request",
    422:    "Unprocessable Content",
    423:    "Locked",
    424:    "Failed Dependency",
    425:    "Too Early",
    426:    "Upgrade Required",
    428:    "Precondition Required",
    429:    "Too Many Requests",
    431:    "Request Header Fields Too Large",
    451:    "Unavailable For Legal Reasons",
    500:    "Internal Server Error",
    501:    "Not Implemented",
    502:    "Bad Gateway",
    503:    "Service Unavailable",
    504:    "Gateway Timeout",
    505:    "HTTP Version Not Supported",
    506:    "Variant Also Negotiates",
    507:    "Insufficient Storage",
    508:    "Loop Detected",
    510:    "Not Extended",
    511:    "Network Authentication Required",
}
