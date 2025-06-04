# Use the official Node.js image as a base image
FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set the working directory ia  nside the container
WORKDIR /usr/src/app

# Expose the application port
EXPOSE 5000

# Command to run the application
CMD ["node", "server.js"]
