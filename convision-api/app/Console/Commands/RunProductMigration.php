<?php

namespace App\Console\Commands;

use App\Services\LensToProductMigrationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class RunProductMigration extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'product:migrate 
                           {--reset : Reset migrations before running}
                           {--seed : Run seeders after migration}
                           {--force : Force migration without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run complete product system migration including database migrations and data migration';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('🚀 Starting Complete Product System Migration');
        $this->newLine();

        if (!$this->option('force')) {
            $this->warn('⚠️  This will:');
            $this->line('   • Run database migrations for product system');
            $this->line('   • Migrate existing lens data to products');
            $this->line('   • Update all related records');
            $this->line('   • Create product categories');
            
            if ($this->option('reset')) {
                $this->line('   • Reset all migrations first');
            }
            
            if ($this->option('seed')) {
                $this->line('   • Run database seeders');
            }
            
            $this->newLine();

            if (!$this->confirm('Do you want to continue?')) {
                $this->info('Migration cancelled.');
                return 0;
            }
        }

        try {
            // Step 1: Reset migrations if requested
            if ($this->option('reset')) {
                $this->info('🔄 Resetting migrations...');
                Artisan::call('migrate:reset', [], $this->getOutput());
                $this->info('✅ Migrations reset completed');
            }

            // Step 2: Run migrations
            $this->info('📊 Running database migrations...');
            Artisan::call('migrate', [], $this->getOutput());
            $this->info('✅ Database migrations completed');

            // Step 3: Run seeders if requested
            if ($this->option('seed')) {
                $this->info('🌱 Running database seeders...');
                Artisan::call('db:seed', [], $this->getOutput());
                $this->info('✅ Database seeders completed');
            }

            // Step 4: Run data migration
            $this->info('🔄 Running lens to product data migration...');
            $migrationService = new LensToProductMigrationService();
            
            // Create product categories
            $migrationService->createMissingProductCategories();
            $this->info('📋 Product categories created');

            // Migrate lens data
            $stats = $migrationService->migrateAllLensesToProducts();
            $this->info('✅ Data migration completed');

            // Step 5: Display results
            $this->newLine();
            $this->info('📊 Migration Statistics:');
            $this->table(
                ['Metric', 'Count'],
                [
                    ['Lenses Migrated', $stats['lenses_migrated']],
                    ['Attributes Created', $stats['attributes_created']],
                    ['Discount Requests Updated', $stats['discount_requests_updated']],
                    ['Inventory Items Updated', $stats['inventory_items_updated']],
                    ['Inventory Transfers Updated', $stats['inventory_transfers_updated']],
                    ['Notes Updated', $stats['notes_updated']],
                    ['Errors', count($stats['errors'])]
                ]
            );

            if (!empty($stats['errors'])) {
                $this->newLine();
                $this->error('❌ Errors encountered:');
                foreach ($stats['errors'] as $error) {
                    $this->line("   • {$error}");
                }
                return 1;
            }

            $this->newLine();
            $this->info('✅ Complete product system migration successful!');
            
            $this->newLine();
            $this->info('🎉 Next Steps:');
            $this->line('   1. Test product endpoints: GET /api/v1/products');
            $this->line('   2. Test category endpoints: GET /api/v1/product-categories');
            $this->line('   3. Test lens filtering: GET /api/v1/products/category/lens');
            $this->line('   4. Update frontend to use new product APIs');
            $this->line('   5. Phase out legacy lens endpoints when ready');

            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Migration failed: {$e->getMessage()}");
            $this->error("   Check the logs for more details");
            return 1;
        }
    }
}
