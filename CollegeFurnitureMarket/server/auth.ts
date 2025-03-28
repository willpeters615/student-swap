import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "college-furniture-marketplace-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Check if username is actually an email
        const isEmail = username.includes('@');
        
        let user;
        if (isEmail) {
          user = await storage.getUserByEmail(username);
          if (!user) {
            console.log(`No user found with email: ${username}`);
          }
        } else {
          user = await storage.getUserByUsername(username);
          if (!user) {
            console.log(`No user found with username: ${username}`);
            // Try as email anyway in case user entered email in username field
            user = await storage.getUserByEmail(username);
          }
        }
        
        if (!user) {
          console.log("No user found");
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const passwordMatches = await comparePasswords(password, user.password);
        if (!passwordMatches) {
          console.log("Password does not match");
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register a new user
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate email format
      const emailSchema = z.string().email("Invalid email address");
      const emailResult = emailSchema.safeParse(req.body.email);
      
      if (!emailResult.success) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      
      // Check if email looks like a university email
      const email = req.body.email.toLowerCase();
      if (!email.endsWith('.edu') && !email.includes('university') && !email.includes('college')) {
        return res.status(400).json({ error: "Please use a university email address" });
      }
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      
      // Extract university domain from email
      const emailParts = email.split('@');
      let university = "Unknown University";
      
      if (emailParts.length > 1) {
        const domain = emailParts[1];
        const domainParts = domain.split('.');
        if (domainParts.length > 0) {
          university = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) + " University";
        }
      }
      
      // Create hashed password
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create user
      const userData: InsertUser = {
        username: req.body.username,
        email: email,
        password: hashedPassword,
        university: university
      };
      
      const userSchema = insertUserSchema.parse(userData);
      const user = await storage.createUser(userSchema);
      
      // Log in the user after registration
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user without password
        const { password, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt with:", { 
      username: req.body.username,
      passwordProvided: !!req.body.password
    });
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed:", info?.message || "No info message");
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      
      console.log("User authenticated successfully:", user.username);
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login session error:", loginErr);
          return next(loginErr);
        }
        
        // Return user without password
        const { password, ...safeUser } = user;
        console.log("Login successful for:", safeUser.username);
        res.json(safeUser);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Return user without password
    const { password, ...safeUser } = req.user;
    res.json(safeUser);
  });
}
