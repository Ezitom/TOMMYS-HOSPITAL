$images = @{
    "doctor-adaeze.jpg"       = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400"
    "doctor-emeka.jpg"        = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400"
    "doctor-fatima.jpg"       = "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400"
    "doctor-chukwuemeka.jpg"  = "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300"
    "doctor-ngozi.jpg"        = "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300"
    "doctor-babatunde.jpg"    = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300"
    "about-doctor.jpg"        = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600"
    "about-team.jpg"          = "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600"
    "patient-testimonial-1.jpg" = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150"
    "patient-testimonial-2.jpg" = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    "patient-testimonial-3.jpg" = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150"
    "leadership-director.jpg" = "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300"
    "leadership-nurse.jpg"    = "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=300"
    "leadership-admin.jpg"    = "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300"
}

if (-not (Test-Path "images")) {
    New-Item -ItemType Directory -Path "images" | Out-Null
}

foreach ($name in $images.Keys) {
    $url = $images[$name]
    $path = "images\$name"
    if (Test-Path $path) {
        Write-Host "Already exists: $name"
        continue
    }
    try {
        Invoke-WebRequest -Uri $url -OutFile $path -UserAgent "Mozilla/5.0" -TimeoutSec 30
        Write-Host "Downloaded: $name"
    } catch {
        Write-Host "Failed to download $name : $_"
    }
}
