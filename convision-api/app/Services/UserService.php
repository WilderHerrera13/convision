<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserService
{
    public function getFilteredUsers(Request $request)
    {
        return User::apiFilter($request);
    }

    public function createUser(array $validatedData): User
    {
        DB::beginTransaction();

        try {
            $userData = [
                'name' => $validatedData['name'],
                'last_name' => $validatedData['last_name'],
                'email' => $validatedData['email'],
                'identification' => $validatedData['identification'],
                'phone' => $validatedData['phone'] ?? null,
                'password' => Hash::make($validatedData['password']),
                'role' => $validatedData['role']
            ];

            $user = User::create($userData);
            
            DB::commit();
            
            return $user;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating user: ' . $e->getMessage(), [
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function updateUser(User $user, array $validatedData): User
    {
        DB::beginTransaction();

        try {
            $updateData = [
                'name' => $validatedData['name'],
                'last_name' => $validatedData['last_name'],
                'email' => $validatedData['email'],
                'identification' => $validatedData['identification'],
                'phone' => $validatedData['phone'] ?? null,
                'role' => $validatedData['role']
            ];

            if (!empty($validatedData['password'])) {
                $updateData['password'] = Hash::make($validatedData['password']);
            }

            $user->update($updateData);
            
            DB::commit();
            
            return $user->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating user: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function deleteUser(User $user): bool
    {
        DB::beginTransaction();

        try {
            $user->delete();
            
            DB::commit();
            
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting user: ' . $e->getMessage(), [
                'user_id' => $user->id
            ]);
            throw $e;
        }
    }

    public function findUser(int $userId): User
    {
        return User::findOrFail($userId);
    }
} 