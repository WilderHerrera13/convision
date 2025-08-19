<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LensToProductMigrationService;
use Illuminate\Support\Facades\Log;

class MigrateLensesToProducts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:lenses-to-products';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrates existing lenses data from the old lenses table to the new products system.';

    /**
     * The LensToProductMigrationService instance.
     *
     * @var LensToProductMigrationService
     */
    protected $migrationService;

    /**
     * Create a new command instance.
     *
     * @param LensToProductMigrationService $migrationService
     * @return void
     */
    public function __construct(LensToProductMigrationService $migrationService)
    {
        parent::__construct();
        $this->migrationService = $migrationService;
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting migration of lenses to products...');
        Log::channel('stderr')->info('[ArtisanCommand] Starting migration of lenses to products...');

        try {
            $stats = $this->migrationService->migrateAllLensesToProducts();

            $this->info('Migration completed!');
            $this->line("Lenses Migrated: " . $stats['lenses_migrated']);
            $this->line("Attributes Created/Updated: " . $stats['attributes_created']);
            $this->line("Discount Requests Updated: " . $stats['discount_requests_updated']);
            $this->line("Inventory Items Updated: " . $stats['inventory_items_updated']);
            $this->line("Inventory Transfers Updated: " . $stats['inventory_transfers_updated']);
            $this->line("Notes Updated: " . $stats['notes_updated']);

            if (!empty($stats['errors'])) {
                $this->warn('Some errors occurred during migration:');
                foreach ($stats['errors'] as $error) {
                    $this->error($error);
                    Log::channel('stderr')->error('[ArtisanCommand] Migration Error: ' . $error);
                }
            }
            Log::channel('stderr')->info('[ArtisanCommand] Migration completed successfully.', $stats);
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('An critical error occurred during migration: ' . $e->getMessage());
            Log::channel('stderr')->error('[ArtisanCommand] Critical Migration Failure: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return Command::FAILURE;
        }
    }
} 