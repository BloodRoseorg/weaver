const weaver = require('./weaver.js');

function main (request, handler) {
    console.log( `ROUTE: ${weaver.routeUri(request)}\n\tUSER: ${weaver.hashId(request)}\n\tMETHOD: ${weaver.routeMethod(request)}\n\tQUERY: ${JSON.stringify(weaver.routeQueryObject(request))}` )
    weaver.respond(handler, { code: "200", mime: "text/html", body: "This is the default Weaver example snippet" });
}

weaver.router(main)
weaver.listen(8080)