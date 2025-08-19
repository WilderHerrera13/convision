<?php

namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

trait ApiFilterable
{
    public function scopeApiFilter($query, Request $request)
    {
        $fields = $request->query('s_f', []);
        $values = $request->query('s_v', []);
        $operator = $request->query('s_o', 'and'); // Default to AND operator

        // Log the raw input values
        Log::debug('ApiFilterable raw input:', [
            'url' => $request->fullUrl(),
            'raw_fields' => $fields,
            'raw_values' => $values,
            'operator' => $operator
        ]);

        if (is_string($fields)) $fields = json_decode($fields, true);
        if (is_string($values)) $values = json_decode($values, true);

        // Log the decoded values
        Log::debug('ApiFilterable decoded input:', [
            'fields' => $fields,
            'values' => $values
        ]);

        if (is_array($fields) && is_array($values) && count($fields) === count($values) && count($fields) > 0) {
            $query->where(function($q) use ($fields, $values, $operator) {
                foreach ($fields as $i => $field) {
                    $value = $values[$i];
                    $method = $i === 0 ? 'where' : ($operator === 'or' ? 'orWhere' : 'where');
                    
                    // Log each filter being applied
                    Log::debug('ApiFilterable applying filter:', [
                        'index' => $i,
                        'field' => $field,
                        'value' => $value,
                        'method' => $method
                    ]);
                    
                    if (strpos($field, '.') !== false) {
                        [$relation, $relField] = explode('.', $field, 2);
                        $q->$method(function($subQ) use ($relation, $relField, $value) {
                            $subQ->whereHas($relation, function ($q) use ($relField, $value) {
                                $q->where($relField, 'like', "%$value%");
                            });
                        });
                    } else {
                        // Check if it's a direct ID field
                        if (substr($field, -3) === '_id' && is_numeric($value)) {
                            // For ID fields, use exact matching
                            $q->$method($field, '=', $value);
                            Log::debug('ApiFilterable using exact match for ID field', [
                                'field' => $field,
                                'value' => $value
                            ]);
                        } else {
                            // For text fields, use LIKE matching
                            $q->$method($field, 'like', "%$value%");
                            Log::debug('ApiFilterable using LIKE match for text field', [
                                'field' => $field,
                                'value' => $value
                            ]);
                        }
                    }
                }
            });
        } else {
            Log::debug('ApiFilterable skipping filters due to invalid input');
        }

        // Direct status filter (handled separately from s_f and s_v)
        if ($request->has('status')) {
            $query->where('status', $request->status);
            Log::debug('ApiFilterable applied status filter', [
                'status' => $request->status
            ]);
        }

        // Check for direct ID filters that bypass s_f and s_v
        $directIdFilters = ['brand_id', 'material_id', 'lens_class_id', 'treatment_id', 'photochromic_id', 'supplier_id', 'type_id'];
        foreach ($directIdFilters as $idField) {
            if ($request->has($idField)) {
                $query->where($idField, $request->input($idField));
                Log::debug("ApiFilterable applied direct {$idField} filter", [
                    $idField => $request->input($idField)
                ]);
            }
        }

        // Sorting (optional)
        if ($request->has('sort')) {
            [$column, $direction] = explode(',', $request->get('sort') . ',asc');
            $query->orderBy($column, $direction);
            Log::debug('ApiFilterable applied sorting', [
                'column' => $column,
                'direction' => $direction
            ]);
        }

        // Log SQL query for debugging
        $sqlWithBindings = str_replace(['?'], array_map(function ($binding) {
            return is_numeric($binding) ? $binding : "'{$binding}'";
        }, $query->getBindings()), $query->toSql());
        
        Log::debug('ApiFilterable final SQL query:', [
            'sql' => $sqlWithBindings
        ]);

        return $query;
    }

    public function apiPaginate($query, Request $request)
    {
        $perPage = $request->get('per_page', 10);
        return $query->paginate($perPage);
    }
} 