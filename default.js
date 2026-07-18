const weaver = require('weaver.js');
weaver.router(router);

function router(request, handler)
{
	response = {
		code: 200,
		mime: "text/raw",
		body: "Hello, world!\n"
	};
	weaver.respond(handler, response);
}

weaver.listen(8080);
