#!/bin/bash

# Create images directory if it doesn't exist
mkdir -p images

# Declare associative array of image names and Unsplash URLs
declare -A images
images=(
    ["doctor-adaeze.jpg"]="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400"
    ["doctor-emeka.jpg"]="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400"
    ["doctor-fatima.jpg"]="https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400"
    ["doctor-chukwuemeka.jpg"]="https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300"
    ["doctor-ngozi.jpg"]="https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300"
    ["doctor-babatunde.jpg"]="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300"
    ["about-doctor.jpg"]="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600"
    ["about-team.jpg"]="https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600"
    ["patient-testimonial-1.jpg"]="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150"
    ["patient-testimonial-2.jpg"]="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    ["patient-testimonial-3.jpg"]="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150"
    ["leadership-director.jpg"]="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300"
    ["leadership-nurse.jpg"]="https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=300"
    ["leadership-admin.jpg"]="https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300"
)

# Loop and download
for name in "${!images[@]}"; do
    url="${images[$name]}"
    echo "Downloading $name..."
    curl -L -s -o "images/$name" "$url"
done

echo "Download completed!"
