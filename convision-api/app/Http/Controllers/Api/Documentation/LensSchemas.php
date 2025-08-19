<?php

namespace App\Http\Controllers\Api\Documentation;

/**
 * @OA\Schema(
 *     schema="Lens",
 *     type="object",
 *     required={"internal_code", "identifier", "type", "material", "lens_class", "supplier", "price", "cost"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="internal_code", type="string", example="SV-001"),
 *     @OA\Property(property="identifier", type="string", example="ESS-SV-PREMIUM"),
 *     @OA\Property(property="type", type="string", example="Single Vision"),
 *     @OA\Property(property="brand", type="string", example="Essilor"),
 *     @OA\Property(property="material", type="string", example="CR-39"),
 *     @OA\Property(property="lens_class", type="string", example="Premium"),
 *     @OA\Property(property="treatment", type="string", example="Anti-Reflective"),
 *     @OA\Property(property="photochromic", type="string", example="Gen 8"),
 *     @OA\Property(property="description", type="string", example="High-quality single vision lenses"),
 *     @OA\Property(property="supplier", type="string", example="Essilor International"),
 *     @OA\Property(property="price", type="number", format="float", example=199.99),
 *     @OA\Property(property="cost", type="number", format="float", example=89.99),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="LensType",
 *     type="object",
 *     required={"name"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Single Vision"),
 *     @OA\Property(property="description", type="string", example="Standard single vision lenses"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="LensClass",
 *     type="object",
 *     required={"name"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Premium"),
 *     @OA\Property(property="description", type="string", example="High-end lens class"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="LensMaterial",
 *     type="object",
 *     required={"name"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="CR-39"),
 *     @OA\Property(property="description", type="string", example="Standard plastic material"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="LensTreatment",
 *     type="object",
 *     required={"name"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Anti-Reflective"),
 *     @OA\Property(property="description", type="string", example="Reduces glare and reflections"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *     schema="LensPhotochromic",
 *     type="object",
 *     required={"name"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Gen 8"),
 *     @OA\Property(property="description", type="string", example="Latest generation photochromic technology"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class LensSchemas {} 