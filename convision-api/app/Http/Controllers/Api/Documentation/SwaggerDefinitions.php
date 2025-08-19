<?php

namespace App\Http\Controllers\Api\Documentation;

/**
 * @OA\Info(
 *     version="1.0.0",
 *     title="Convision API Documentation",
 *     description="API documentation for the Convision application
 *
 * ## Filtering and Pagination
 * The API supports the following filter and pagination parameters:
 *
 * - `page`: Page number for pagination (default: 1)
 * - `per_page`: Number of items per page (default: 15)
 * - `s_f`: Search fields, can be comma-separated or JSON array
 * - `s_v`: Search values corresponding to s_f fields
 * - `sort`: Sort by field and direction (format: field,direction)
 *
 * ### Example
 * ```
 * /api/v1/patients?s_f=[\"description\"]&s_v=[\"Progresivo KODAK UNIQUE HD DRO/CR 39/talla Digital/AR KODAK BLUE PROTECT\"]&sort=created_at,asc
 * ```
 * ",
 *     @OA\Contact(
 *         email="admin@convision.com",
 *         name="Convision Support"
 *     ),
 *     @OA\License(
 *         name="Apache 2.0",
 *         url="http://www.apache.org/licenses/LICENSE-2.0.html"
 *     )
 * )
 */

/**
 * @OA\SecurityScheme(
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     securityScheme="bearerAuth",
 *     description="Enter token in format (Bearer <token>)"
 * )
 */

/**
 * @OA\Schema(
 *     schema="User",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="John Doe"),
 *     @OA\Property(property="email", type="string", format="email", example="john@example.com"),
 *     @OA\Property(property="role", type="string", example="specialist")
 * )
 */

/**
 * @OA\Schema(
 *     schema="Patient",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="first_name", type="string", example="Jane"),
 *     @OA\Property(property="last_name", type="string", example="Smith"),
 *     @OA\Property(property="email", type="string", format="email", example="jane@example.com"),
 *     @OA\Property(property="phone", type="string", example="123-456-7890"),
 *     @OA\Property(property="identification", type="string", example="ABC123456"),
 *     @OA\Property(property="identification_type", type="string", example="ID Card"),
 *     @OA\Property(property="birth_date", type="string", format="date", example="1990-01-01"),
 *     @OA\Property(property="gender", type="string", example="female"),
 *     @OA\Property(property="address", type="string", example="123 Main St"),
 *     @OA\Property(property="city", type="string", example="Anytown"),
 *     @OA\Property(property="state", type="string", example="State"),
 *     @OA\Property(property="postal_code", type="string", example="12345"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Patient notes go here"),
 *     @OA\Property(property="status", type="string", example="active")
 * )
 */

/**
 * @OA\Schema(
 *     schema="Prescription",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="appointment_id", type="integer", example=1),
 *     @OA\Property(property="date", type="string", format="date", example="2024-04-01"),
 *     @OA\Property(property="document", type="string", example="prescription-doc"),
 *     @OA\Property(property="patient_name", type="string", example="Jane Smith"),
 *     @OA\Property(property="right_sphere", type="string", nullable=true),
 *     @OA\Property(property="right_cylinder", type="string", nullable=true),
 *     @OA\Property(property="right_axis", type="string", nullable=true),
 *     @OA\Property(property="right_addition", type="string", nullable=true),
 *     @OA\Property(property="right_height", type="string", nullable=true),
 *     @OA\Property(property="right_distance_p", type="string", nullable=true),
 *     @OA\Property(property="right_visual_acuity_far", type="string", nullable=true),
 *     @OA\Property(property="right_visual_acuity_near", type="string", nullable=true),
 *     @OA\Property(property="left_sphere", type="string", nullable=true),
 *     @OA\Property(property="left_cylinder", type="string", nullable=true),
 *     @OA\Property(property="left_axis", type="string", nullable=true),
 *     @OA\Property(property="left_addition", type="string", nullable=true),
 *     @OA\Property(property="left_height", type="string", nullable=true),
 *     @OA\Property(property="left_distance_p", type="string", nullable=true),
 *     @OA\Property(property="left_visual_acuity_far", type="string", nullable=true),
 *     @OA\Property(property="left_visual_acuity_near", type="string", nullable=true),
 *     @OA\Property(property="correction_type", type="string", nullable=true),
 *     @OA\Property(property="usage_type", type="string", nullable=true),
 *     @OA\Property(property="recommendation", type="string", nullable=true),
 *     @OA\Property(property="professional", type="string", nullable=true),
 *     @OA\Property(property="observation", type="string", nullable=true),
 *     @OA\Property(property="attachment", type="string", nullable=true)
 * )
 */

/**
 * @OA\Schema(
 *     schema="Appointment",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="patient_id", type="integer", example=1),
 *     @OA\Property(property="specialist_id", type="integer", example=1),
 *     @OA\Property(property="receptionist_id", type="integer", example=1),
 *     @OA\Property(property="scheduled_at", type="string", format="date-time", example="2024-03-20 14:30:00"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Regular checkup"),
 *     @OA\Property(property="status", type="string", enum={"scheduled","completed","cancelled"}, example="scheduled"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time"),
 *     @OA\Property(
 *         property="patient",
 *         ref="#/components/schemas/Patient"
 *     ),
 *     @OA\Property(
 *         property="specialist",
 *         ref="#/components/schemas/User"
 *     ),
 *     @OA\Property(
 *         property="receptionist",
 *         ref="#/components/schemas/User"
 *     ),
 *     @OA\Property(
 *         property="prescription",
 *         ref="#/components/schemas/Prescription"
 *     )
 * )
 */

/**
 * @OA\Schema(
 *     schema="Order",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="order_number", type="string", example="ORD-001"),
 *     @OA\Property(property="patient_id", type="integer", example=1),
 *     @OA\Property(property="status", type="string", enum={"pending","processing","completed","cancelled"}, example="pending"),
 *     @OA\Property(property="total", type="number", format="float", example=199.99),
 *     @OA\Property(property="payment_status", type="string", enum={"pending","paid","refunded"}, example="pending"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Rush order"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */

/**
 * @OA\Parameter(
 *     parameter="pagination",
 *     name="page",
 *     in="query",
 *     description="Page number for pagination",
 *     required=false,
 *     @OA\Schema(
 *         type="integer",
 *         default=1
 *     )
 * )
 */

/**
 * @OA\Parameter(
 *     parameter="per_page",
 *     name="per_page",
 *     in="query",
 *     description="Number of items per page",
 *     required=false,
 *     @OA\Schema(
 *         type="integer",
 *         default=15
 *     )
 * )
 */

/**
 * @OA\Parameter(
 *     parameter="search_fields",
 *     name="s_f",
 *     in="query",
 *     description="Search fields. Can be a comma-separated string (like 'name,email') or a JSON array (like '[\"description\"]')",
 *     required=false,
 *     @OA\Schema(
 *         type="string",
 *         example="[\"description\"]"
 *     )
 * )
 */

/**
 * @OA\Parameter(
 *     parameter="search_values",
 *     name="s_v",
 *     in="query",
 *     description="Search values corresponding to search_fields. Can be a comma-separated string or a JSON array",
 *     required=false,
 *     @OA\Schema(
 *         type="string",
 *         example="[\"Progresivo KODAK UNIQUE HD DRO/CR 39/talla Digital/AR KODAK BLUE PROTECT\"]"
 *     )
 * )
 */

/**
 * @OA\Parameter(
 *     parameter="sort",
 *     name="sort",
 *     in="query",
 *     description="Sort by field and direction (format: field,direction)",
 *     required=false,
 *     @OA\Schema(
 *         type="string",
 *         example="created_at,asc"
 *     )
 * )
 */

/**
 * @OA\Parameter(
 *     parameter="filter_example",
 *     name="example",
 *     in="query",
 *     description="Example of using all filter parameters together",
 *     required=false,
 *     @OA\Schema(
 *         type="string",
 *         example="s_f=[\"description\"]&s_v=[\"Progresivo KODAK UNIQUE HD DRO/CR 39/talla Digital/AR KODAK BLUE PROTECT\"]&sort=created_at,asc&page=1&per_page=15"
 *     )
 * )
 */

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
 */

/**
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
 */

/**
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
 */

/**
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
 */

/**
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
 */

/**
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
?>
