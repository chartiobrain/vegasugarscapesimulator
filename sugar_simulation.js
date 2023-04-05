class Agent {
    constructor(id, vision, metabolism, initialSugar) {
        this.id = id;
        this.x = Math.floor(Math.random() * 50);
        this.y = Math.floor(Math.random() * 50);
        this.sugar = initialSugar;
        this.vision = vision;
        this.metabolism = metabolism;
        this.lifespan = Math.floor(Math.random() * (200 - 60 + 1)) + 60; // Random lifespan between 60 and 100
        this.age = 0; 
      }
    
      findBestPatch(grid, occupiedPositions) {
        const directions = [
          { dx: 0, dy: 1 },  // North
          { dx: 1, dy: 0 },  // East
          { dx: 0, dy: -1 }, // South
          { dx: -1, dy: 0 }  // West
        ];

        const gridSize = 50; // Assuming the grid size is 50x50

        let bestSugar = -1;
        let bestPatch = null;
        let minDistance = Infinity;

        directions.forEach(({ dx, dy }) => {
          for (let i = 1; i <= this.vision; i++) {
            // Calculate the new position with wrap-around
            const newX = (this.x + dx * i + gridSize) % gridSize;
            const newY = (this.y + dy * i + gridSize) % gridSize;

            if (occupiedPositions.has(`${newX},${newY}`)) {
                continue; // Skip this position if it is occupied
              }

            const index = newX * gridSize + newY;
            const patch = grid[index];
            if (patch.sugar_level > bestSugar) {
              bestSugar = patch.sugar_level;
              bestPatch = patch;
              minDistance = i;
            } else if (patch.sugar_level === bestSugar && i < minDistance) {
              bestPatch = patch;
              minDistance = i;
            }
          }
        });

        return bestPatch;
    }

    move(grid, agents) {
        // Create the occupiedPositions set
        const occupiedPositions = new Set();
        agents.forEach(agent => {
          occupiedPositions.add(`${agent.x},${agent.y}`);
        });
      
        // Pass the occupiedPositions set to the findBestPatch method
        const bestPatch = this.findBestPatch(grid, occupiedPositions);
        if (bestPatch) {
          // Check if the best patch is already occupied
          if (occupiedPositions.has(`${bestPatch.x},${bestPatch.y}`)) {
            // If the best patch is occupied, skip this move
            return false;
          }
      
          this.x = bestPatch.x;
          this.y = bestPatch.y;
          this.sugar += bestPatch.sugar_level;
          bestPatch.sugar_level = 0;
          this.age++;
      
          // Wrap around the grid if necessary (toroidal behavior)
          const gridSize = 50; // Assuming the grid size is 50x50
          if (this.x >= gridSize) this.x -= gridSize;
          if (this.y >= gridSize) this.y -= gridSize;
          if (this.x < 0) this.x += gridSize;
          if (this.y < 0) this.y += gridSize;
        }
      
        // Subtract metabolism from sugar
        this.sugar -= this.metabolism;
      
        // Check if the agent has died
        if (this.sugar <= 0 || this.age >= this.lifespan) {
          return true; // Agent has died or reached the end of its lifespan
        }
      
        return false; // Agent is alive
      }
      
      hasReachedEndOfLifespan() {
        return this.age >= this.lifespan;
      }
      
    
  }
  
  class SugarSimulation {
    constructor(growbackRate, distributionType) {
      this.distributionType = distributionType;
      this.grid = this.createGrid();
      this.agents = this.createAgents();
      this.timeStep = 0;
      this.growbackRate = growbackRate;
      this.taxRate = 0.1; // Define the tax rate (e.g., 10%)
      this.initialSugarLevels = this.grid.map(cell => cell.sugar_level);
      this.nextAgentId = this.agents.length; // Initialize nextAgentId based on the number of agents created
      this.survivingAgentsData = [];
      this.giniData = [];
      this.ageOfDeathByVision = [];

    }


    createWealthHistogram(agents) {
        // Create an array of wealth values for all agents
        const wealthData = agents.map(agent => ({ wealth: agent.sugar }));
        return wealthData;
      }
      

    distances(pos, sugar_peaks, max_sugar) {
        const all_dists = sugar_peaks.map(peak => {
        const d = Math.round(Math.sqrt(Math.pow(pos.x - peak.x, 2) + Math.pow(pos.y - peak.y, 2)));
        return d;
        });
        return Math.min(...all_dists);
    }
    
    sugar_caps(dims, sugar_peaks, max_sugar, dia = 4) {
        const sugar_capacities = Array.from({ length: dims[0] }, () => Array(dims[1]).fill(0));
        for (let i = 0; i < dims[0]; i++) {
        for (let j = 0; j < dims[1]; j++) {
            const dist = this.distances({ x: i, y: j }, sugar_peaks, max_sugar);
            sugar_capacities[i][j] = Math.max(0, Math.round(max_sugar - dist / dia));
        }
        }
        return sugar_capacities;
    }

    

    calculateAverageAgeOfDeathByVision() {
        const visionBuckets = {};
        this.ageOfDeathByVision.forEach(({ age, vision }) => {
          if (!visionBuckets[vision]) {
            visionBuckets[vision] = { totalAge: 0, count: 0 };
          }
          visionBuckets[vision].totalAge += age;
          visionBuckets[vision].count += 1;
        });
      
        const averageAgeOfDeathData = [];
        for (const [vision, data] of Object.entries(visionBuckets)) {
          const averageLifespan = data.totalAge / data.count; // Renamed variable
          averageAgeOfDeathData.push({ vision, averageLifespan }); // Use "averageLifespan" as field name
        }
        return averageAgeOfDeathData;
      }

      
      calculateGiniCoefficient() {
        // Get the sugar levels of all agents
        const sugarLevels = this.agents.map(agent => agent.sugar);
      
        // Step 1: Sort the values in ascending order
        const sortedValues = sugarLevels.slice().sort((a, b) => a - b);
      
        // Step 2: Calculate the cumulative sum of the values
        const cumulativeSum = sortedValues.map((value, index, array) => {
          return array.slice(0, index + 1).reduce((a, b) => a + b, 0);
        });
      
        // Step 3: Calculate the cumulative proportion of the total sum for each value
        const totalSum = cumulativeSum[cumulativeSum.length - 1];
        const cumulativeProportions = cumulativeSum.map(sum => sum / totalSum);
      
        // Step 4: Calculate the area under the Lorenz curve
        const n = cumulativeProportions.length;
        let areaUnderCurve = 0;
        for (let i = 0; i < n - 1; i++) {
          areaUnderCurve += (cumulativeProportions[i] + cumulativeProportions[i + 1]) / 2 * (1 / n);
        }
      
        // Step 5: Calculate the Gini coefficient
        const giniCoefficient = 1 - (2 * areaUnderCurve);
      
        return giniCoefficient;
      }
      
    createNewAgent(id) {
        const vision = Math.floor(Math.random() * 5) + 1;
        const metabolism = Math.floor(Math.random() * 4) + 1;
        const initialSugar = Math.floor(Math.random() * 21) + 5;
        return new Agent(id, vision, metabolism, initialSugar);
      }
      

      createClusteredGrid() {
        let grid = [];
        const gridSize = 50;
        const clusterCenter = { x: gridSize / 2, y: gridSize / 2 }; // Center of the grid
        const maxSugarLevel = 4; // Maximum sugar level at the center
        const minSugarLevel = 1; // Minimum sugar level at the edges
        for (let x = 0; x < gridSize; x++) {
          for (let y = 0; y < gridSize; y++) {
            // Calculate the distance to the center of the grid
            const distanceToCenter = Math.sqrt(Math.pow(x - clusterCenter.x, 2) + Math.pow(y - clusterCenter.y, 2));
            // Normalize the distance to the range [0, 1]
            const normalizedDistance = distanceToCenter / (gridSize / 2);
            // Calculate the sugar level based on the distance (higher near the center, lower near the edges)
            let sugar_level = maxSugarLevel * (1 - normalizedDistance) + minSugarLevel * normalizedDistance;
            // Cap the sugar level at the maximum value of 4
            sugar_level = Math.min(sugar_level, maxSugarLevel);
            grid.push({ x, y, sugar_level });
          }
        }
        return grid;
      }
    
      
  

    printData() {
        console.log(`Time Step: ${this.timeStep}`);
        console.log('Grid Sugar Levels:');
    
        console.log('Agent Sugar Levels:');
        this.agents.forEach((agent) => {
          console.log(`Agent ${agent.id}: ${agent.sugar.toFixed(2)}`);
        });


        console.log('----------------------------------------');
      }


      createGrid() {
        if (this.distributionType === 'clustered') {
          // Define parameters
          const dims = [50, 50];
          const sugar_peaks = [{ x: 10, y: 40 }, { x: 40, y: 10 }];
          const max_sugar = 4;
    
          // Generate sugar capacities
          const sugar_capacities = this.sugar_caps(dims, sugar_peaks, max_sugar);
    
          // Create the grid using the sugar capacities
          let grid = [];
          for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
              grid.push({ x, y, sugar_level: sugar_capacities[x][y] });
            }
          }
          return grid;
        }

      }
  
    createAgents() {
        let agents = [];
        for (let i = 0; i < 250; i++) {
            const vision = Math.floor(Math.random() * 5) + 1; // Whole number between 1 and 6
            const metabolism = Math.floor(Math.random() * 4) + 1; // Whole number between 1 and 4
            const initialSugar = Math.floor(Math.random() * 21) + 5; // Whole number between 5 and 25
          agents.push(new Agent(i, vision, metabolism, initialSugar));
        }
        return agents;
      }
  

       // Define the shuffleArray function within the SugarSimulation class
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
    }


    growback(cell, index) {
      const initialLevel = this.initialSugarLevels[index];
      if (cell.sugar_level < initialLevel) {
        cell.sugar_level = Math.round(cell.sugar_level + initialLevel / this.growbackRate);
        if (cell.sugar_level > initialLevel) {
          cell.sugar_level = initialLevel;
        }
      }
    }

    getMergedData() {
        const gridData = this.grid.map(cell => ({
          ...cell,
          type: 'cell'
        }));
        const agentData = this.agents.map(agent => ({
          x: agent.x,
          y: agent.y,
          type: 'agent',
          sugar: agent.sugar //add sugar property to represent wealth
        }));
        return gridData.concat(agentData);
      }
  
      step() {
        // Create an array to store surviving agents
        const survivingAgents = [];
        this.shuffleArray(this.agents);

        const occupiedPositions = new Set();
        this.agents.forEach(agent => {
        occupiedPositions.add(`${agent.x},${agent.y}`);
        });


        if (this.timeStep % 10 === 0) {
            // Calculate the total tax collected
            const totalTaxCollected = this.agents.reduce((total, agent) => {
              const taxCollectedFromAgent = agent.sugar * this.taxRate;
              agent.sugar -= taxCollectedFromAgent; // Deduct tax from each agent's wealth
              return total + taxCollectedFromAgent;
            }, 0);


    // Agent logic: Move each agent and check if they have died
        this.agents.forEach(agent => {
        const hasDied = agent.move(this.grid, this.agents); // Pass the agents array here
        const reachedEndOfLifespan = agent.hasReachedEndOfLifespan();
        if (!hasDied && !reachedEndOfLifespan) {
          // Agent has survived, add to the survivingAgents array
          survivingAgents.push(agent);
        } else {
          // Agent has reached end of lifespan or starved, replace with a new agent
          this.ageOfDeathByVision.push({ age: agent.age, vision: agent.vision });
    
          const newAgent = this.createNewAgent(this.nextAgentId++);
          survivingAgents.push(newAgent);
        }
    });



    const giniCoefficient = this.calculateGiniCoefficient();
    console.log('Gini Coefficient:', giniCoefficient);

    // Update the Gini data array
    this.giniData.push({ timeStep: this.timeStep, giniCoefficient: giniCoefficient });
    // ...


    // Update the agents array to only include surviving agents
    this.agents = survivingAgents;
    this.survivingAgentsData.push({ timeStep: this.timeStep, survivingAgents: this.agents.length });


    // Growback logic for each cell
    this.grid.forEach((cell, index) => this.growback(cell, index));

    this.printData();

    this.timeStep++;
    }
    }
  
  function runSimulationStep(view, simulation, giniChartView, visionSurvivalChartView, wealthHistogramView ) {
    // Run a step of the simulation
    simulation.step();
  
    // Get the updated data (mergedData includes both grid and agent data)
    const mergedData = simulation.getMergedData();
  
    // Update the data in the Vega View
    view.change('values', vega.changeset().remove(() => true).insert(mergedData))
        .runAsync();




    giniChartView.change('giniData', vega.changeset().remove(() => true).insert(simulation.giniData)).runAsync();

  
    wealthHistogramView.change('wealthData', vega.changeset().remove(() => true).insert(simulation.agents.map(agent => ({ wealth: agent.sugar })))).runAsync();


    // Update the lifespan chart with the new data
    visionSurvivalChartView.change('averageAgeOfDeathData', vega.changeset().remove(() => true).insert(simulation.calculateAverageAgeOfDeathByVision())).runAsync();

    // Schedule the next simulation step (you can adjust the interval as needed)
    setTimeout(() => runSimulationStep(view, simulation, giniChartView, visionSurvivalChartView, wealthHistogramView), 1);
  }


  // Define the function to initialize the simulation and visualization
    function runSimulation(distributionType) {
    // Create an instance of the SugarSimulation class
    const simulation = new SugarSimulation(4, distributionType);
  
    // Get the initial data for the visualization
    const mergedData = simulation.getMergedData();
  
    // Visualize the simulation using Vega



    // Define the Vega-Lite specification for the histogram
    const wealthHistogramSpec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "data": { "name": "wealthData" },
    "mark": "bar",
    "encoding": {
      "x": {
        "field": "wealth",
        "type": "quantitative",
        "bin": true, // Use binning to create the histogram
        "axis": { "title": "Wealth" }
      },
      "y": {
        "aggregate": "count", // Count the number of agents in each bin
        "type": "quantitative",
        "axis": { "title": "Number of Agents" }
      }
    },
    "width": 500,
    "height": 350
    };

    const visionSurvivalChartSpec = {

        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 500,
        "height": 350,
        "data": {"name": "averageAgeOfDeathData"}, // Use a named data source
        "mark": "bar",
        "encoding": {
          "x": {
            "field": "vision",
            "type": "ordinal",
            "title": "Vision"
          },
          "y": {
            "field": "averageLifespan",
            "type": "quantitative",
            "title": "Average Lifespan"
          }
        }
    };
      

      const giniChartSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 500,
        "height": 350,
        "data": {"name": "giniData"}, // Use a named data source
        "mark": "area",
        "encoding": {
          "x": {
            "field": "timeStep", // Use the timeStep field for the x-axis
            "type": "quantitative",
            "axis": {"title": "Time Step"}
          },
          "y": {
            "field": "giniCoefficient", // Use the giniCoefficient field for the y-axis
            "type": "quantitative",
            "axis": {"title": "Gini Coefficient"} 
          }
        }
      };
  
      
    const spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "Initial sugar distribution in the grid",
        "data": {
          "name": "values"
        },
        "width": 600,
        "height": 600,
        "layer": [
          {
            "mark": "rect",
            "encoding": {
              "x": {
                "field": "x",
                "type": "ordinal",
                "axis": { "title": "North/South", "labelAngle": 0 }
              },
              "y": {
                "field": "y",
                "type": "ordinal",
                "axis": { "title": "Y", "labelAngle": 0 }
              },
              "color": {
                "field": "sugar_level",
                "type": "quantitative",
                "scale": { "range": ["#F0E68C", "#8B4513"] },
                "legend": { "title": "Sugar Level" },
                
              }
            }
          },
          {
            "mark": "circle",
            "encoding": {
            "size": {
                "field": "sugar",
                "type": "quantitative",
                "scale": { "range": [50, 100] }, // Set the size range (min: 50, max: 100)
                "legend": null
                  },
              "x": {
                "field": "x",
                "type": "ordinal"
              },
              "y": {
                "field": "y",
                "type": "ordinal"
              },
              "color": { "value": "black" },
              "opacity": {
                "condition": {
                  "test": "datum.type === 'agent'",
                  "value": 1
                },
                "value": 0
              }
            }
          }
        ]
      };

const vegaSpec = vegaLite.compile(spec).spec;

// Create a Vega View instance from the Vega specification
  const view = new vega.View(vega.parse(vegaSpec))
  .renderer('canvas')
  .initialize('#vis')
  .data('values', mergedData)
  .run();


  const giniChartView = new vega.View(vega.parse(vegaLite.compile(giniChartSpec).spec))
.renderer('canvas')
.initialize('#giniChart') // Specify the HTML element where the chart will be rendered
.data('giniData', []) // Initialize with an empty array
.run();


    // Create a Vega View instance from the Vega-Lite specification
const visionSurvivalChartView = new vega.View(vega.parse(vegaLite.compile(visionSurvivalChartSpec).spec))
.renderer('canvas')
.initialize('#visionsurvival')
.data('averageAgeOfDeathData', simulation.calculateAverageAgeOfDeathByVision()) // Initialize with the calculated data
.run();


const wealthHistogramView = new vega.View(vega.parse(vegaLite.compile(wealthHistogramSpec).spec))
  .renderer('canvas')
  .initialize('#wealthHistogram') // Specify the HTML element where the histogram will be rendered
  .data('wealthData', simulation.agents.map(agent => ({ wealth: agent.sugar }))) // Initialize with the initial data
  .run();



  // Start running the simulation
  runSimulationStep(view, simulation, giniChartView, visionSurvivalChartView, wealthHistogramView);
}
  

  runSimulation('clustered'); // Call the function to run the simulation and visualize it
  


/*  */