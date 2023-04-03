class Agent {
    constructor(id, vision, metabolism, initialSugar) {
        this.id = id;
        this.x = Math.floor(Math.random() * 30);
        this.y = Math.floor(Math.random() * 30);
        this.sugar = initialSugar;
        this.vision = vision;
        this.metabolism = metabolism;
        this.lifespan = Math.floor(Math.random() * 41) + 40; // Initialize lifespan to a random value between 40 and 80
        this.age = 0; 
      }
    
      findBestPatch(grid) {
        const directions = [
          { dx: 0, dy: 1 },  // North
          { dx: 1, dy: 0 },  // East
          { dx: 0, dy: -1 }, // South
          { dx: -1, dy: 0 }  // West
        ];
    
        let bestSugar = -1;
        let bestPatch = null;
        let minDistance = Infinity;
    
        directions.forEach(({ dx, dy }) => {
          for (let i = 1; i <= this.vision; i++) {
            const newX = this.x + dx * i;
            const newY = this.y + dy * i;
    
            // Check if the new position is within the grid boundaries
            if (newX >= 0 && newX < 30 && newY >= 0 && newY < 30) {
              const index = newX * 30 + newY;
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
          }
        });
    
        return bestPatch;
      }
    
      move(grid) {
        const bestPatch = this.findBestPatch(grid);
        if (bestPatch) {
          this.x = bestPatch.x;
          this.y = bestPatch.y;
          this.sugar += bestPatch.sugar_level;
          bestPatch.sugar_level = 0;
          this.lifespan = 60
          this.age++


        }
    
        // Subtract metabolism from sugar
        this.sugar -= this.metabolism;
    
        // Check if the agent has died
        if (this.sugar <= 0 || this.lifespan <= 0) {
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
      this.initialSugarLevels = this.grid.map(cell => cell.sugar_level);
      this.nextAgentId = this.agents.length; // Initialize nextAgentId based on the number of agents created
      this.survivingAgentsData = [];
      this.giniData = [];

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
        areaUnderCurve += (cumulativeProportions[i] + cumulativeProportions[i + 1]) / 2;
        }
        areaUnderCurve /= n;

        // Step 5: Calculate the Gini coefficient
        const giniCoefficient = 1 - (2 * areaUnderCurve);

        return giniCoefficient;
    }

    createNewAgent(id) {
        const vision = Math.floor(Math.random() * 6) + 1;
        const metabolism = Math.floor(Math.random() * 4) + 1;
        const initialSugar = Math.floor(Math.random() * 21) + 5;
        return new Agent(id, vision, metabolism, initialSugar);
      }
      

    createClusteredGrid() {
        let grid = [];
        for (let x = 0; x < 30; x++) {
          for (let y = 0; y < 30; y++) {
            const clusterCenter = { x: 15, y: 15 };
            const distanceToCenter = Math.sqrt(Math.pow(x - clusterCenter.x, 2) + Math.pow(y - clusterCenter.y, 2));
                const sugar_level = Math.min(distanceToCenter < 5 ? Math.random() * 10 : Math.random() * 2, 4); // Cap at 4
            grid.push({ x, y, sugar_level });
          }
        }
        return grid;
      }
    
      createBimodalGrid() {
        let grid = [];
        for (let x = 0; x < 30; x++) {
          for (let y = 0; y < 30; y++) {
            const sugar_level = Math.min((x < 10 || x > 20) ? Math.random() * 10 : Math.random() * 2, 4); // Cap at 4
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
          return this.createClusteredGrid();
        } else if (this.distributionType === 'bimodal') {
          return this.createBimodalGrid();
        } else {
          // Default to even distribution
          let grid = [];
          for (let x = 0; x < 30; x++) {
            for (let y = 0; y < 30; y++) {
              grid.push({ x, y, sugar_level: Math.random() * 10 });
            }
          }
          return grid;
        }
      }
  
    createAgents() {
        let agents = [];
        for (let i = 0; i < 30; i++) {
          const vision = Math.floor(Math.random() * 6) + 1;
          const metabolism = Math.floor(Math.random() * 4) + 1;
          const initialSugar = Math.floor(Math.random() * 21) + 5;
          agents.push(new Agent(i, vision, metabolism, initialSugar));
        }
        return agents;
      }
  
    growback(cell, index) {
      const initialLevel = this.initialSugarLevels[index];
      if (cell.sugar_level < initialLevel) {
        cell.sugar_level += initialLevel / this.growbackRate;
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

        // Agent logic: Move each agent and check if they have died
        this.agents.forEach(agent => {
            const hasDied = agent.move(this.grid);
            const reachedEndOfLifespan = agent.hasReachedEndOfLifespan();
            if (!hasDied && !reachedEndOfLifespan) {
            // Agent has survived, add to the survivingAgents array
            survivingAgents.push(agent);
            } else {
                // Agent has reached end of lifespan or starved, replace with a new agent
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
  
  function runSimulationStep(view, simulation, lineChartView, giniChartView) {
    // Run a step of the simulation
    simulation.step();
  
    // Get the updated data (mergedData includes both grid and agent data)
    const mergedData = simulation.getMergedData();
  
    // Update the data in the Vega View
    view.change('values', vega.changeset().remove(() => true).insert(mergedData))
        .runAsync();


    // Update the line chart with the new data
    lineChartView.change('lineChartData', vega.changeset().remove(() => true).insert(simulation.survivingAgentsData)).runAsync();

    giniChartView.change('giniData', vega.changeset().remove(() => true).insert(simulation.giniData)).runAsync();

  
    // Schedule the next simulation step (you can adjust the interval as needed)
    setTimeout(() => runSimulationStep(view, simulation, lineChartView, giniChartView), 500);
  }


  // Define the function to initialize the simulation and visualization
    function runSimulation(distributionType) {
    // Create an instance of the SugarSimulation class
    const simulation = new SugarSimulation(30, distributionType);
  
    // Get the initial data for the visualization
    const mergedData = simulation.getMergedData();
  
    // Visualize the simulation using Vega

        
    const lineChartSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": { "name": "lineChartData" },
        "mark": "line",
        "encoding": {
          "x": { "field": "timeStep", "type": "quantitative", "axis": { "title": "Time Step" } },
          "y": { "field": "survivingAgents", "type": "quantitative", "axis": { "title": "Surviving Agents" } }
        }
      };

      const giniChartSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 300,
        "height": 200,
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
            "title": "Gini Coefficient"
          }
        }
      };
  
      
    const spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "Initial sugar distribution in the grid",
        "data": {
          "name": "values"
        },
        "width": 300,
        "height": 300,
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


  const lineChartView = new vega.View(vega.parse(vegaLite.compile(lineChartSpec).spec))
  .renderer('canvas')
  .initialize('#lineChart') // Specify the HTML element where the line chart will be rendered
  .data('lineChartData', simulation.survivingAgentsData) // Initialize with the initial data
  .run();

  const giniChartView = new vega.View(vega.parse(vegaLite.compile(giniChartSpec).spec))
    .renderer('canvas')
    .initialize('#giniChart') // Specify the HTML element where the chart will be rendered
    .data('giniData', []) // Initialize with an empty array
    .run();



  // Start running the simulation
  runSimulationStep(view, simulation, lineChartView, giniChartView);
}
  

  runSimulation('bimodal'); // Call the function to run the simulation and visualize it
  