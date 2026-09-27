import React from 'react';
import mcAfeeImage from '../assets/McAfeeThirthyFive.png';
import thysRanst from '../assets/ThysRanst.png';

export interface BlogPost {
  id: number;
  title: string;
  date: string;
  preview: string;
  content: React.ReactNode;
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "How LiDARs Really Work (and Why They Don't Shoot Lasers at Your Face)",
    date: "December 2024",
    preview: "A fun, slightly dramatic deep dive into the sensors that help cars 'see' — minus the sci-fi laser battles Hollywood promised us.",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          If you've ever wondered how self-driving cars "see" the world around them, the answer is probably sitting 
          on top of the vehicle, spinning quietly like a tiny disco ball. That's LiDAR — Light Detection and Ranging — 
          and it's basically giving the car superpowers.
        </p>
        
        <h3 className="text-xl font-bold text-white mt-6 mb-3">What Even Is LiDAR?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          LiDAR works by shooting out laser pulses — millions of them per second — and measuring how long it takes 
          for each pulse to bounce back. It's like echolocation for bats, except with light instead of sound. 
          Each returning pulse tells the sensor exactly how far away an object is, down to the centimeter.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          The result? A detailed 3D point cloud of everything around the vehicle: pedestrians, other cars, trees, 
          road signs, that random shopping cart someone left in the parking lot. It updates in real-time, giving 
          the car a constantly refreshed map of its surroundings.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">But Wait, Isn't a Laser Dangerous?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Great question. And the answer is: not really. Automotive LiDAR uses infrared light at wavelengths 
          around 905nm or 1550nm, which are classified as Class 1 lasers. That's the same safety rating as your 
          TV remote or a barcode scanner at the grocery store.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          The power is distributed across a wide field of view, and the pulses are incredibly brief. So no, 
          the self-driving car rolling past you isn't going to accidentally laser your retina. Hollywood lied 
          to us (again).
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Why Not Just Use Cameras?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Cameras are great — they're cheap, high-resolution, and can read street signs. But they struggle in 
          low light, get confused by shadows, and can't directly measure distance. A white car in front of a 
          white wall? Good luck with that.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          LiDAR doesn't care about lighting conditions. Rain? Works. Fog? Mostly works. Complete darkness? 
          Still works. It gives you direct, precise depth information without having to infer it from pixels.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Real Challenge: Processing All That Data</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Here's the thing people don't talk about enough: a single LiDAR can generate millions of points per 
          second. That's a massive amount of data. You need to filter out noise (reflections from rain, dust, 
          insects), cluster points into objects, track those objects over time, and predict where they're going 
          — all in real-time, because the car is moving at 60 mph and needs to make decisions <em>now</em>.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is where sensor fusion comes in. LiDAR gives you the geometry, cameras give you texture and 
          semantics (like reading traffic lights), and radar gives you velocity. Combine all three, and you've 
          got a pretty solid understanding of the world.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Future of LiDAR</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Early LiDAR units cost $75,000 and looked like giant rotating buckets. Now? You can get solid-state 
          LiDAR for under $1,000, and they're getting smaller, cheaper, and more capable every year.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Some companies (looking at you, Tesla) are betting that cameras alone can solve autonomous driving. 
          Others think LiDAR is essential. Personally? I think the debate misses the point. It's not about which 
          sensor is "better" — it's about building systems that are redundant, robust, and safe. And right now, 
          LiDAR is one of the best tools we have for that.
        </p>
        <p className="text-gray-300 leading-relaxed">
          So next time you see a self-driving car with that spinning sensor on top, give it a little nod of 
          respect. It's working hard to not run you over.
        </p>
      </div>
    )
  },
  {
    id: 2,
    title: "Why Sensor Fusion is Harder Than It Sounds",
    date: "November 2024",
    preview: "Combining camera, radar, and LiDAR data sounds simple in theory. In practice, it's like conducting an orchestra where every instrument is playing a different song.",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          Sensor fusion is one of those terms that sounds straightforward: you have multiple sensors, you combine 
          their data, and boom — you get a better understanding of the world. Except in reality, it's more like 
          trying to merge three different languages, spoken at different speeds, with different levels of accuracy, 
          all while driving at highway speeds.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Coordinate System Problem</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Let's start with the basics. Every sensor on a vehicle has its own coordinate system. The camera sees 
          the world in pixels. LiDAR measures distances in 3D space. Radar gives you range and velocity in polar 
          coordinates. Before you can fuse anything, you need to transform all of this data into a common reference 
          frame.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is called extrinsic calibration, and it needs to be <em>precise</em>. We're talking millimeter-level 
          accuracy. If your LiDAR is off by just a few degrees, that pedestrian at 50 meters suddenly appears to be 
          standing in the middle of the road instead of on the sidewalk. And now your car is slamming on the brakes 
          for no reason.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Oh, and this calibration? It can drift over time due to vibrations, temperature changes, or just normal 
          wear and tear. So you need mechanisms to detect and correct for miscalibration automatically. Fun times.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Timing is Everything</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Here's another problem: your sensors don't all run at the same frequency. Your camera might capture frames 
          at 30 Hz. Your LiDAR spins at 10 Hz. Your radar updates at 20 Hz. And your GPS? That's refreshing at 
          1-10 Hz depending on the unit.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Why does this matter? Because a car moving at 60 mph (about 27 m/s) covers almost 3 meters in just 100 
          milliseconds. If your sensors are out of sync by even that small amount, you're fusing stale data — trying 
          to combine a LiDAR measurement from 100ms ago with a camera frame from right now. The car you detected? 
          It's not actually where you think it is anymore.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          The solution is temporal alignment: you need to interpolate or extrapolate sensor data to a common 
          timestamp. But interpolation introduces uncertainty. And extrapolation? That's just guessing with 
          extra steps.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Association Problem</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Now let's say you've got everything calibrated and time-synced. Great! But here's the next challenge: 
          how do you know that the object detected by the camera is the same object detected by the LiDAR?
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is called the data association problem, and it's harder than it sounds. The camera might see a car 
          and a pedestrian. The LiDAR might see three distinct clusters of points. The radar might detect two moving 
          targets. Which detection corresponds to which?
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          You can use algorithms like the Hungarian algorithm or Joint Probabilistic Data Association (JPDA) to 
          solve this, but they're computationally expensive. And if you get it wrong? Congrats, you just fused a 
          pedestrian with a lamppost, and now your perception stack thinks there's a 7-foot-tall object that's both 
          stationary and moving at the same time.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Conflicting Information</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Even when everything is aligned and associated correctly, sensors can disagree. The camera says there's 
          a car 20 meters ahead. The LiDAR says 21 meters. The radar says 19.5 meters. Which one is right?
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is where you need robust fusion algorithms — typically Kalman filters or particle filters — that 
          can weigh the reliability of each sensor and produce a fused estimate. But these filters need to know 
          how much to trust each sensor, which depends on environmental conditions. LiDAR is great in clear weather 
          but struggles in heavy rain. Cameras are useless at night without good lighting. Radar is consistent but 
          has low resolution.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          So now you need adaptive fusion: dynamically adjusting trust levels based on context. And that's a whole 
          other research problem.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Computational Constraints</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Oh, and did I mention you have to do all of this in real-time, on embedded hardware, with limited power 
          and cooling? A typical autonomous vehicle might process gigabytes of sensor data per second. You can't 
          just throw a server rack in the trunk.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          This means optimizing algorithms, parallelizing computations, and making hard trade-offs between accuracy 
          and latency. Sometimes "good enough" in 50 milliseconds is better than "perfect" in 200 milliseconds — 
          because by the time you finish computing, the world has already changed.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">So Why Bother?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Because when done right, sensor fusion is <em>incredible</em>. You get the best of all worlds: the 
          resolution of cameras, the precision of LiDAR, and the velocity measurements of radar. You get redundancy, 
          so if one sensor fails, the others can compensate. You get robustness across different weather conditions 
          and lighting scenarios.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          It's hard. Really hard. But it's also one of the most important problems in autonomous driving. Because 
          at the end of the day, fusing sensors isn't just about making better maps or tracking objects more 
          accurately. It's about building systems that are safe enough to trust with human lives.
        </p>
        <p className="text-gray-300 leading-relaxed">
          And that's worth the effort.
        </p>
      </div>
    )
  },
  {
    id: 3,
    title: "Hacking a Self-Driving Car with a Post-it Note",
    date: "January 2025",
    preview: "Adversarial attacks are the optical illusions of the AI world. Here is how a piece of tape can turn a Stop sign into a Speed Limit sign.",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          Imagine you are a state-of-the-art Deep Learning model. You have been trained on millions of images. 
          You can spot a pedestrian in a blizzard. You can distinguish a Chihuahua from a blueberry muffin. 
          But then, someone puts a small, specifically patterned sticker on a Stop sign.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          To a human, it’s just a vandalized Stop sign. But to the model's internal mathematical representation, 
          that sticker shifts the probability distribution just enough to flip the final classification. 
          It is now confidentially a "Speed Limit 45" sign. Welcome to the terrifying world of <strong>Adversarial Attacks</strong>.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">It's Not Magic, It's Math</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Neural networks work by finding complex patterns in pixel data (edges, textures, shapes). Adversarial attacks exploit this by introducing 
          perturbations—tiny changes to pixels that are often invisible to the human eye but push the image across a 
          decision boundary in the model's high-dimensional space.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          To understand <em>how</em> this happens, you have to look at the "Gradient." When we train an AI, we use the gradient to minimize error—essentially 
          telling the model, "Change your parameters this way to get the right answer."
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          An attack works in reverse. The attacker asks the model, "How do I change this image's pixels to <strong>maximize</strong> the error?" 
          The model's own math reveals the exact weak spots. The attacker then nudges the pixels in that specific direction. 
          It is jujitsu for algorithms; using the model's own force against it.
        </p>
         
        {/* --- IMAGE START --- */}
        <figure className="float-right ml-6 mb-4 w-64">
          <img 
            src={mcAfeeImage} 
            alt="McAfee research showing a 35 mph sign modified with tape to look like 85 mph to a computer vision system"
            className="w-full rounded-lg shadow-lg border border-gray-700"
          />
          <figcaption className="text-center text-gray-400 text-sm mt-2">
            Source: McAfee ATR. The Mobileye camera read this modified sign as "85 MPH".
          </figcaption>
        </figure>
         {/* --- IMAGE END --- */}

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The McAfee "Speed Limit" Hack</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Digital attacks are one thing, but physical attacks are scarier. In a famous study, researchers from McAfee ATR managed to fool a 
          Tesla Model S (specifically the Mobileye EyeQ3 camera system) into accelerating autonomously.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          They didn't hack the software. They simply went to a hardware store. By placing a 2-inch strip of black electrical tape 
          horizontally across the middle of the "3" on a "35 MPH" sign, they slightly elongated the center line. 
          To a human, it still clearly looked like a 3. But to the computer vision algorithm, the specific arrangement of edges and contrast 
          perfectly matched the statistical features of an "8".
        </p>

        <p className="text-gray-300 leading-relaxed mb-4">
          The car read the sign as "85 MPH" and the Traffic Aware Cruise Control (TACC) automatically accelerated the vehicle towards that speed. 
          This proves that you don't need a supercomputer to crash a car; you just need to understand how the vision sensor extracts features.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Invisibility Cloak</h3>
        {/* --- IMAGE START --- */}
        <figure className="float-right ml-6 mb-4 w-64">
          <img 
            src={thysRanst} 
            alt="An adversarial patch that is successfully able to hide persons from a person detector. Left: The person without a patch is successfully detected. Right: The person holding the patch is ignored."
            className="w-full rounded-lg shadow-lg border border-gray-700"
          />
          <figcaption className="text-center text-gray-400 text-sm mt-2">
            Source: Fooling automated surveillance cameras: adversarial patches to attack person detection.
          </figcaption>
        </figure>
         {/* --- IMAGE END --- */}
        <p className="text-gray-300 leading-relaxed mb-4">
          It isn't just about making a Stop sign look like a Speed Limit sign. Sometimes, the goal is to make things disappear entirely.
          Researchers (Thys et al.) developed "adversarial patches"—trippy, psychedelic patterns that look like abstract art to us.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          These patches effectively hack object detectors like <strong>YOLO (You Only Look Once)</strong>. 
          YOLO divides an image into a grid and assigns an "objectness" score to each section. The adversarial patch is optimized to 
          crush this objectness score.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          When a person holds this printed patch over their stomach, the patch acts as a "salient" distractor. 
          It overwhelms the neural network's activation map, causing the probability of the "Person" class to drop below the detection threshold. 
          The bounding box simply vanishes. To the AI, the person has ceased to exist.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Do Hackers Need the Source Code?</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          You might think, "Well, my model is proprietary and hidden on a server, so I'm safe." Unfortunately, not quite.
          Attacks are split into <strong>White Box</strong> (attacker has the model's code) and <strong>Black Box</strong> (attacker knows nothing).
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          In a Black Box attack, hackers can train their <em>own</em> substitute model to mimic yours, generate attacks against their substitute, 
          and then use those same attacks on your model. Surprisingly, these attacks are often "transferable." 
          An adversarial image that fools a Google model will often fool a Facebook model, because they both learn similar features about the world.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">How We Fix It</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          <strong>1. Adversarial Training:</strong> We essentially "vaccinate" the model by generating these attacks ourselves 
          during the training phase and teaching the model to ignore them.
          <br/><br/>
          <strong>2. Sensor Redundancy:</strong> This is the big one. If the camera thinks the Stop sign is a Speed Limit sign, 
          but the HD Map says "There is definitely a junction here," and the Lidar sees a wall, the car should be 
          smart enough to prioritize safety over the camera's confusion.
          <br/><br/>
          <strong>3. Input Sanitization:</strong> Before the image even reaches the neural network, we can "wash" it. 
          Techniques like JPEG compression or slight blurring can destroy the delicate high-frequency noise of an attack 
          without hurting the overall image too much.
          <br/><br/>
          <strong>4. The Infinite Arms Race:</strong> The reality is that defense is harder than offense. 
          Every time researchers invent a new defense, attackers find a way to bypass it. Security in AI isn't a destination; it’s a constant game of cat and mouse.
        </p>
      </div>
    )
  },
  {
    id: 4,
    title: "NeRFs vs. Gaussian Splatting: The Battle for 3D Supremacy",
    date: "February 2025",
    preview: "Why represent a 3D world with a neural network when you can just throw millions of glowing 3D blobs at the screen?",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-8">
          For a few years, <strong>NeRFs (Neural Radiance Fields)</strong> were the undisputed kings of 3D reconstruction. 
          They used neural networks to "imagine" what an object looked like from any angle. The results were photorealistic, 
          but rendering them was painfully slow.
        </p>
        <p className="text-gray-300 text-lg leading-relaxed mb-12">
          Enter <strong>3D Gaussian Splatting (3DGS)</strong>. It dropped in 2023, and it essentially said: "Forget the neural network. 
          Let's just use millions of 3D ellipsoids." But before we choose a winner, we need to understand the battlefield.
        </p>
    
        <div className="border-l-4 border-blue-500 pl-6 my-10 bg-gray-900/50 py-4 rounded-r-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Part 1: The Basics (Computer Vision 101)</h2>
          <p className="text-gray-300 mb-4">
              Before we talk about AI, we have to solve a physics problem: <strong>How do we get 3D depth from flat 2D images?</strong>
          </p>
        </div>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">1. The Pinhole Camera Model</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Every photo you take is a squashed version of reality. A 3D world (X, Y, Z) is projected onto a 2D plane (u, v pixels).
          To reverse this, we need to know two things about the camera that took the photo:
        </p>
        <ul className="list-disc list-inside text-gray-300 mb-6 ml-4 space-y-2">
          <li><strong>Extrinsics (Where was the camera?):</strong> The Position (X,Y,Z) and Rotation of the camera in the world.</li>
          <li><strong>Intrinsics (How does the lens work?):</strong> The Focal Length and Principal Point. This tells us how "zoomed in" the image is.</li>
        </ul>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">2. Structure from Motion (SfM) & COLMAP</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is Step Zero for both NeRFs and Gaussian Splats. We feed 50-100 images into a tool called <strong>COLMAP</strong>.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          COLMAP uses algorithms like SIFT (Scale-Invariant Feature Transform) to find "key points"—distinctive corners, edges, or textures 
          that appear in multiple photos. If it sees the same "corner of a table" in Image A and Image B, it can draw a line from both cameras. 
          <strong>Where those lines intersect in 3D space is the point's location.</strong>
        </p>
        
        <p className="text-gray-300 leading-relaxed mb-8">
          This process creates a <strong>"Sparse Point Cloud"</strong>—a ghostly cloud of floating dots that roughly outlines the scene. 
          This is our starting point.
        </p>
    
        <div className="border-l-4 border-purple-500 pl-6 my-10 bg-gray-900/50 py-4 rounded-r-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Part 2: The NeRF Era (Implicit Representation)</h2>
        </div>
    
        <p className="text-gray-300 leading-relaxed mb-4">
          NeRFs look at that Sparse Point Cloud and say, "That's not enough detail." But instead of storing more points, NeRFs store the scene 
          inside a function.
        </p>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">The "Black Box" Approach</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          A NeRF is a <strong>Multi-Layer Perceptron (MLP)</strong>—a tiny neural network. You give it a coordinate (X, Y, Z) and a viewing direction, 
          and it outputs a Color (RGB) and a Density (Sigma).
          <br/>
          <em>Input: (x, y, z, theta, phi) → Network → Output: (R, G, B, Opacity)</em>
        </p>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">Why is it so slow? (Ray Marching)</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          To render a <strong>single pixel</strong> on your screen, the NeRF engine has to shoot a ray through that pixel into the 3D void. 
          Because it doesn't know where objects are, it has to "march" along that ray, stopping every few millimeters to ask the neural network: 
          "Is there anything here?"
        </p>
        <p className="text-gray-300 leading-relaxed mb-8">
          It does this hundreds of times <em>per ray</em>. For a 1080p image (2 million pixels), that is billions of network queries per frame. 
          That is why NeRFs run at 0.5 FPS.
        </p>
    
        <div className="border-l-4 border-green-500 pl-6 my-10 bg-gray-900/50 py-4 rounded-r-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Part 3: Gaussian Splatting (Explicit Representation)</h2>
        </div>
    
        <p className="text-gray-300 leading-relaxed mb-4">
          Gaussian Splatting is a return to "Explicit" geometry. It doesn't use a neural network to render. It uses a list of blobs.
        </p>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">The Anatomy of a Splat</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Instead of triangles (like in video games), we use <strong>3D Gaussians</strong> (ellipsoids). 
          The system initializes one Gaussian at every point in the COLMAP sparse cloud. Each Gaussian carries these parameters:
        </p>
        <ul className="list-disc list-inside text-gray-300 mb-6 ml-4 space-y-2">
          <li><strong>Position (Mean):</strong> XYZ center.</li>
          <li><strong>Covariance Matrix:</strong> A 3x3 matrix that defines the shape. Is it a long thin cigar? A flat pancake? A perfect sphere?</li>
          <li><strong>Alpha:</strong> How transparent it is.</li>
          <li><strong>Spherical Harmonics (SH):</strong> This is the magic. It stores 16+ numbers that define how the color changes depending on the viewing angle (simulating gloss/reflections).</li>
        </ul>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">How It Learns: Adaptive Density Control</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          This is the most brilliant part of the algorithm. We start with a sparse, hole-filled cloud. We need to fill it in.
          We perform <strong>Gradient Descent</strong> comparing the rendered image to the real photo.
        </p>
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h4 className="font-bold text-blue-400 mb-2">The "Clone vs. Split" Logic:</h4>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li><strong>Under-Reconstruction:</strong> If an area is too blurry but the Gaussian is small, the system <strong>CLONES</strong> it (makes a copy) and moves it slightly to fill the gap.</li>
            <li><strong>Over-Reconstruction:</strong> If a Gaussian is huge and trying to cover too much detail (high variance), the system <strong>SPLITS</strong> it into two smaller Gaussians to capture finer detail.</li>
            <li><strong>Pruning:</strong> If a Gaussian becomes virtually invisible (Alpha &lt; 0.005), it is deleted to save memory.</li>
          </ul>
        </div>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">The Speed Secret: Tile-Based Rasterization</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          NeRFs are slow because of Ray Marching. Gaussian Splatting is fast because of <strong>Rasterization</strong>.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          1. <strong>Projection:</strong> The 3D ellipsoids are mathematically projected onto the 2D camera plane.
          <br/>
          2. <strong>Sorting:</strong> The system uses a super-fast GPU Radix Sort to order the splats from front-to-back.
          <br/>
          3. <strong>Tiling:</strong> The screen is divided into 16x16 pixel tiles. Each tile only processes the splats that touch it.
          <br/>
          4. <strong>Alpha Blending:</strong> The colors are accumulated until the opacity reaches 100%.
        </p>
        <p className="text-gray-300 leading-relaxed mb-8">
          This pipeline avoids querying a neural network entirely. It’s pure matrix math, which GPUs eat for breakfast. 
          This is how we get <strong>100+ FPS</strong>.
        </p>
    
        <h3 className="text-xl font-bold text-white mt-8 mb-4">The Verdict</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          <strong>NeRFs</strong> are perfect if you have tiny storage limits (MBs) and don't care about render time.
          <br/>
          <strong>Gaussian Splats</strong> are the future for real-time applications (VR, AR, Autonomous Driving sims). 
          The files are larger (GBs), but the ability to render photorealism at 120 FPS is a game-changer we haven't seen in decades.
        </p>
      </div>
    )
  },
  {
    id: 5,
    title: "The Matrix for Cars: Why Simulation is King",
    date: "March 2025",
    preview: "You can't drive a real car off a cliff a thousand times to see what happens. But in a simulator? You can do it before breakfast.",
    content: (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 text-lg leading-relaxed mb-4">
          Waymo and Cruise have driven millions of miles in the real world. That sounds impressive, but in the grand scheme of 
          statistics, it's nothing. To prove an autonomous vehicle is statistically safer than a human, you need billions of miles of validation.
          Driving that physically would take centuries.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          We can't wait 500 years. So, we enter the Matrix.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Long Tail Problem</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Driving on a sunny highway is easy. Driving when a mattress falls off the truck in front of you while it's hailing 
          and a kangaroo jumps out? That's an "edge case."
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          These edge cases are rare in real life (the "Long Tail" of data distributions), but they are where accidents happen. 
          In a simulator (like CARLA or proprietary engines), we can script these scenarios. We can make it rain mattresses 
          all day long until the AI learns how to dodge them.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">Sim-to-Real Gap</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          The challenge is the "Sim-to-Real gap." If the physics in the simulator aren't perfect, or the lighting looks slightly "video game-y," 
          the AI might overfit to the simulation. It learns to play the game, not drive the car.
          This leads to the comical situation of an AI being a perfect driver in the simulator but crashing instantly in the real world because 
          shadows look different.
        </p>

        <h3 className="text-xl font-bold text-white mt-6 mb-3">The Data Flywheel</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          Modern development works in a loop:
        </p>
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 font-mono text-sm text-blue-300 mb-4">
           Real cars collect data &rarr; We build a sim from that data &rarr; We train the AI in the sim &rarr; We deploy better AI to real cars.
        </div>
        <p className="text-gray-300 leading-relaxed">
          This is known as <strong>Re-Simulation</strong>. We take a real log where the car made a mistake, 
          turn it into a simulation, and then run it thousands of times with slight variations (different weather, slightly different timing) 
          to ensure the new code actually fixed the problem.
        </p>
      </div>
    )
  }
];
