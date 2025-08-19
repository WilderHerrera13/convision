<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminOrSpecialistRoleMiddleware
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
        $user = auth()->user();
        if (!in_array($user->role, ['admin', 'specialist'])) {
            return response()->json(['error' => 'Unauthorized. Admin or Specialist access required.'], 403);
        }

        return $next($request);
    }
} 