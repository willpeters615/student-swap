/**
 * Database population script for CampusSwap
 * 
 * This script adds sample listings for each type and category
 * to the database to fully populate the marketplace.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Sample user IDs (make sure these users exist in your database)
const userIds = [1, 2]; // Assuming userID 1 is the main user and 2 is testuser

// Item listings by category
const itemListings = [
  // Clothing and Accessories
  {
    title: "Winter Jacket - Like New",
    description: "North Face winter jacket, barely worn. Size medium, black color.",
    price: 8000, // $80.00
    condition: "Like New",
    category: "Clothing and Accessories",
    type: "item",
    images: ["https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&auto=format"],
    location: "Campus Center",
    userId: userIds[0],
    status: "active"
  },
  {
    title: "Designer Sunglasses",
    description: "Ray-Ban Wayfarer sunglasses. Small scratch on the left lens, otherwise good condition.",
    price: 4500, // $45.00
    condition: "Good",
    category: "Clothing and Accessories",
    type: "item",
    images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto=format"],
    location: "Library",
    userId: userIds[1],
    status: "active"
  },
  {
    title: "University Branded Hoodie",
    description: "Official university hoodie, size large. Worn a few times but still in excellent condition.",
    price: 2500, // $25.00
    condition: "Very Good",
    category: "Clothing and Accessories",
    type: "item",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&auto=format"],
    location: "Student Union",
    userId: userIds[0],
    status: "active"
  },
  
  // School Supplies
  {
    title: "Graphing Calculator - TI-84",
    description: "Texas Instruments TI-84 Plus graphing calculator. All functions working perfectly.",
    price: 6000, // $60.00
    condition: "Good",
    category: "School Supplies",
    type: "item",
    images: ["https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=500&auto=format"],
    location: "Engineering Building",
    userId: userIds[1],
    status: "active"
  },
  {
    title: "Physics Textbook - 12th Edition",
    description: "University Physics with Modern Physics by Young and Freedman, 12th edition. No highlights or notes.",
    price: 5500, // $55.00
    condition: "Very Good",
    category: "School Supplies",
    type: "item",
    images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format"],
    location: "Science Hall",
    userId: userIds[0],
    status: "active"
  },
  {
    title: "Wireless Notebook Mouse",
    description: "Logitech M510 wireless mouse. Works perfectly, batteries included.",
    price: 1200, // $12.00
    condition: "Like New",
    category: "School Supplies",
    type: "item",
    images: ["https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format"],
    location: "Computer Lab",
    userId: userIds[1],
    status: "active"
  },
  
  // Sports Equipment
  {
    title: "Tennis Racket - Wilson Pro",
    description: "Wilson Pro Staff RF97 tennis racket. Used for one season, great condition.",
    price: 8500, // $85.00
    condition: "Good",
    category: "Sports Equipment",
    type: "item",
    images: ["https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?w=500&auto=format"],
    location: "Recreation Center",
    userId: userIds[0],
    status: "active"
  },
  {
    title: "Basketball - Official Size",
    description: "Spalding NBA official game basketball, slightly used but in good condition.",
    price: 2000, // $20.00
    condition: "Good",
    category: "Sports Equipment",
    type: "item",
    images: ["https://images.unsplash.com/photo-1494199505258-5f95456d5660?w=500&auto=format"],
    location: "Gym",
    userId: userIds[1],
    status: "active"
  },
  {
    title: "Yoga Mat - Extra Thick",
    description: "Extra thick 1/2 inch yoga mat with carrying strap. Purple color.",
    price: 1500, // $15.00
    condition: "Like New",
    category: "Sports Equipment",
    type: "item",
    images: ["https://images.unsplash.com/photo-1594381898411-846e7d193883?w=500&auto=format"],
    location: "Fitness Center",
    userId: userIds[0],
    status: "active"
  },
  
  // Dining Credits
  {
    title: "Campus Meal Swipes - 10 Remaining",
    description: "10 meal swipes remaining on my meal plan. Can transfer to your account.",
    price: 7000, // $70.00
    condition: "N/A",
    category: "Dining Credits",
    type: "item",
    images: ["https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=500&auto=format"],
    location: "Dining Hall",
    userId: userIds[1],
    status: "active"
  },
  {
    title: "Campus Cafe Gift Card - $25",
    description: "Gift card to the campus cafe with $25 balance. Never used.",
    price: 2000, // $20.00
    condition: "New",
    category: "Dining Credits",
    type: "item",
    images: ["https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500&auto=format"],
    location: "Student Center",
    userId: userIds[0],
    status: "active"
  }
];

// Service listings by category
const serviceListings = [
  // Academic Services
  {
    title: "Math Tutoring - Calculus",
    description: "Expert tutoring in Calculus I, II and III. I've been a TA for 2 years in the math department.",
    price: 2500, // $25.00 per hour
    category: "Academic Services",
    type: "service",
    images: ["https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=500&auto=format"],
    location: "Library or Online",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 3, 15), // April 15, 2025
    duration: "1 hour sessions"
  },
  {
    title: "Essay Proofreading & Editing",
    description: "English major offering proofreading and editing services. Quick turnaround time and thorough feedback.",
    price: 1500, // $15.00
    category: "Academic Services",
    type: "service",
    images: ["https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500&auto=format"],
    location: "Online",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 3, 10), // April 10, 2025
    duration: "48 hour turnaround"
  },
  {
    title: "Python Programming Help",
    description: "Computer Science senior offering help with Python programming assignments and projects.",
    price: 3000, // $30.00
    category: "Academic Services",
    type: "service",
    images: ["https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format"],
    location: "Computer Science Building or Online",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 3, 20), // April 20, 2025
    duration: "Flexible"
  },
  
  // Personal Services
  {
    title: "Professional Headshots",
    description: "Photography major offering professional headshots for LinkedIn, portfolios, or social media.",
    price: 4000, // $40.00
    category: "Personal Services",
    type: "service",
    images: ["https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=500&auto=format"],
    location: "Campus Green",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 3, 25), // April 25, 2025
    duration: "30 minute session"
  },
  {
    title: "Moving Help - Strong Lifter",
    description: "Need help moving in or out of your dorm? I'm available to help lift heavy items and transport boxes.",
    price: 2500, // $25.00
    category: "Personal Services",
    type: "service",
    images: ["https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=500&auto=format"],
    location: "On Campus",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 5, 1), // June 1, 2025
    duration: "Hourly"
  },
  {
    title: "Haircut Services",
    description: "Offering affordable haircuts in my dorm. I've been cutting hair for 3 years.",
    price: 1500, // $15.00
    category: "Personal Services",
    type: "service",
    images: ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&auto=format"],
    location: "North Dorm",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 3, 18), // April 18, 2025
    duration: "30-45 minutes"
  },
  
  // Other Services
  {
    title: "Custom T-shirt Design",
    description: "Graphic design student offering custom t-shirt designs for clubs, events, or personal use.",
    price: 3500, // $35.00
    category: "Other",
    type: "service",
    images: ["https://images.unsplash.com/photo-1586187220643-c722d1ae09fe?w=500&auto=format"],
    location: "Art Building",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 3, 22), // April 22, 2025
    duration: "1 week turnaround"
  },
  {
    title: "Car Rides to Airport",
    description: "Offering rides to the nearby airport during holidays and breaks. Reliable transportation with room for luggage.",
    price: 3000, // $30.00
    category: "Other",
    type: "service",
    images: ["https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&auto=format"],
    location: "Campus Pickup",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 4, 15), // May 15, 2025
    duration: "30-45 minute drive"
  }
];

// Experience listings by category
const experienceListings = [
  // Event Tickets
  {
    title: "Football Game Tickets - Home Opener",
    description: "Two tickets to the home opener football game vs. State University. Great seats in the student section.",
    price: 6000, // $60.00
    category: "Event Tickets",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1495555687398-3f50d6e79e1e?w=500&auto=format"],
    location: "University Stadium",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 8, 15), // September 15, 2025
    duration: "3 hours"
  },
  {
    title: "Spring Concert Tickets - Front Row",
    description: "Two front row tickets to the spring concert featuring popular indie bands.",
    price: 8000, // $80.00
    category: "Event Tickets",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&auto=format"],
    location: "University Arena",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 3, 28), // April 28, 2025
    duration: "4 hours"
  },
  
  // Sports Games
  {
    title: "Basketball Game - Premium Seats",
    description: "Two premium seats for the championship basketball game. Includes free drinks and snacks.",
    price: 7500, // $75.00
    category: "Sports Games",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=500&auto=format"],
    location: "University Arena",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 2, 20), // March 20, 2025
    duration: "2.5 hours"
  },
  {
    title: "Soccer Match - Season Finale",
    description: "One ticket to the season finale soccer match. Our team is currently ranked #2 in the conference!",
    price: 3000, // $30.00
    category: "Sports Games",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=500&auto=format"],
    location: "University Soccer Field",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 4, 5), // May 5, 2025
    duration: "2 hours"
  },
  
  // Concerts
  {
    title: "Orchestra Performance - Classical Night",
    description: "One ticket to the university orchestra's classical night featuring works by Beethoven and Mozart.",
    price: 2500, // $25.00
    category: "Concerts",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format"],
    location: "Performing Arts Center",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 3, 30), // April 30, 2025
    duration: "2 hours"
  },
  {
    title: "Jazz Ensemble - Tribute to Miles Davis",
    description: "Two tickets to the university jazz ensemble's tribute concert to Miles Davis.",
    price: 3000, // $30.00
    category: "Concerts",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=500&auto=format"],
    location: "Jazz Club on Campus",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 4, 10), // May 10, 2025
    duration: "3 hours"
  },
  
  // Campus Events
  {
    title: "Spring Formal Dance Ticket",
    description: "One ticket to the annual Spring Formal dance. Dress code is formal attire.",
    price: 5000, // $50.00
    category: "Campus Events",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=500&auto=format"],
    location: "Grand Ballroom",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 4, 20), // May 20, 2025
    duration: "4 hours"
  },
  {
    title: "Comedy Night - Stand-up Show",
    description: "Two tickets to the comedy night featuring student comedians and a professional headliner.",
    price: 2000, // $20.00
    category: "Campus Events",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=500&auto=format"],
    location: "Student Center Auditorium",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 3, 12), // April 12, 2025
    duration: "2 hours"
  },
  
  // Other Experiences
  {
    title: "Campus Food Tour",
    description: "Join me for a guided tour of the best food spots on and around campus. Includes samples at 5 locations.",
    price: 2500, // $25.00
    category: "Other",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format"],
    location: "Campus Center (Meeting Point)",
    userId: userIds[0],
    status: "active",
    date: new Date(2025, 3, 19), // April 19, 2025
    duration: "3 hours"
  },
  {
    title: "Campus Ghost Tour",
    description: "Late night ghost tour of the campus, visiting all the supposedly haunted buildings with stories of their past.",
    price: 1500, // $15.00
    category: "Other",
    type: "experience",
    images: ["https://images.unsplash.com/photo-1414438359676-aaeec3c864ff?w=500&auto=format"],
    location: "Old Main Building (Meeting Point)",
    userId: userIds[1],
    status: "active",
    date: new Date(2025, 9, 30), // October 30, 2025
    duration: "90 minutes"
  }
];

// Combine all listings
const allListings = [...itemListings, ...serviceListings, ...experienceListings];

// Function to add listings to the database
async function populateListings() {
  console.log('Starting to populate database with sample listings...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const listing of allListings) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .insert([{
          title: listing.title,
          description: listing.description,
          price: listing.price,
          condition: listing.condition,
          category: listing.category,
          type: listing.type,
          images: listing.images,
          location: listing.location,
          user_id: listing.userId,
          status: listing.status,
          date: listing.date ? listing.date.toISOString() : null,
          duration: listing.duration || null,
          created_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error(`Error adding listing "${listing.title}":`, error);
        errorCount++;
      } else {
        console.log(`Successfully added listing: ${listing.title}`);
        successCount++;
      }
    } catch (err) {
      console.error(`Exception while adding listing "${listing.title}":`, err);
      errorCount++;
    }
  }
  
  console.log(`Database population completed!`);
  console.log(`Successfully added: ${successCount} listings`);
  console.log(`Failed to add: ${errorCount} listings`);
}

// Run the population function
populateListings()
  .catch(err => console.error('Error in population script:', err));

// To support ES modules
export { populateListings };