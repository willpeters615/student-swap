/**
 * Database Population Runner
 * 
 * This script imports and runs the populate-db.js script to add
 * sample listings to the database.
 */

// Import necessary modules
import dotenv from 'dotenv';
import { populateListings } from './populate-db.js';

// Configure environment variables
dotenv.config();

// Run the population script
console.log('Running database population script...');
// The populateListings function is auto-executed when importing the module