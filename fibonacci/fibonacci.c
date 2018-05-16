#include <emscripten.h>

int EMSCRIPTEN_KEEPALIVE fib(int n)
{
    if (n == 0 || n == 1) {
        return n;
    } else {
        return fib(n - 2) + fib(n - 1);
    }
}
