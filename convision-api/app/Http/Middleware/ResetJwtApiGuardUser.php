<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use ReflectionClass;
use Tymon\JWTAuth\JWTGuard;

/**
 * JWTGuard caches the authenticated user; the shared JWT manager also keeps the parsed
 * token until unset. In long-lived PHP processes (PHPUnit multiple HTTP calls, Octane) the
 * next request can reuse a stale token/user when the Authorization header changes. Reset
 * both at the start of each API request so the bearer token is always read from the
 * current request.
 */
class ResetJwtApiGuardUser
{
    public function handle(Request $request, Closure $next)
    {
        if (app()->bound('tymon.jwt')) {
            app('tymon.jwt')->unsetToken();
        }

        $guard = Auth::guard('api');

        if ($guard instanceof JWTGuard) {
            $reflection = new ReflectionClass($guard);
            if ($reflection->hasProperty('user')) {
                $prop = $reflection->getProperty('user');
                $prop->setAccessible(true);
                $prop->setValue($guard, null);
            }
        }

        return $next($request);
    }
}
