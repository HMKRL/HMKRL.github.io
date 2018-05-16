function fibJs(n)
{
    if (n == 0 || n == 1) {
        return n
    } else {
        return fibJs(n - 2) + fibJs(n - 1)
    }
}

function fetchAndInstantiateWasm(path, imports)
{
    return fetch(path)
    .then(res => {
        if (res.ok) {
            return res.arrayBuffer()
        } throw new Error('Unable to fetch Web Assembly file ${path}.')
    })
    .then(bytes => WebAssembly.compile(bytes))
    .then(module => WebAssembly.instantiate(module, imports || {}))
    .then(instance => instance.exports)
}

var asm = fetchAndInstantiateWasm('wasm.wasm', {})

function clickJs() {
    asm.then(a => {
        console.time('js')
        console.log(fibJs(40))
        console.timeEnd('js')
    })
}

function clickWasm() {
    asm.then(a => {
        console.time('wasm')
        console.log(fib(40))
        console.timeEnd('wasm')
    })
}
