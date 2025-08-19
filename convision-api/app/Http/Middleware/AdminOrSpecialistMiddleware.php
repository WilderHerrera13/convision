<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminOrSpecialistMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $role = auth()->user()->role;

        if (!in_array($role, ['admin', 'specialist'])) {
            return response()->json(['error' => 'Unauthorized. Admin or Specialist access required.'], 403);
        }

        return $next($request);
    }
}
