
// ATU Study Planner
// Stores study tasks in the browser using localStorage.

const STORAGE_KEY = "atuStudyPlannerTasks";

const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskSubjectInput = document.getElementById("taskSubject");

const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const formMessage = document.getElementById("formMessage");

const totalTasksElement = document.getElementById("totalTasks");
const pendingTasksElement = document.getElementById("pendingTasks");
const completedTasksElement = document.getElementById("completedTasks");
const taskCountElement = document.getElementById("taskCount");
const listHeading = document.getElementById("listHeading");

const navigationButtons = document.querySelectorAll(".nav-item");

let currentFilter = "all";
let tasks = loadTasks();

// Show today's date.
document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

// Load saved tasks safely.
function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        if (!savedTasks) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);

        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        // Keep only tasks with the expected data structure.
        return parsedTasks.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.subject === "string" &&
            typeof task.completed === "boolean"
        );
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

// Save tasks in browser storage.
function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);

        showMessage(
            "Your browser could not save the tasks. Check its storage settings."
        );

        return false;
    }
}

// Display a message to the user.
function showMessage(message) {
    formMessage.textContent = message;
}

// Add a new task.
taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = taskTitleInput.value.trim();
    const subject = taskSubjectInput.value.trim();

    if (!title) {
        showMessage("Please enter a task title.");
        taskTitleInput.focus();
        return;
    }

    if (!subject) {
        showMessage("Please enter a subject or course name.");
        taskSubjectInput.focus();
        return;
    }

    const newTask = {
        id: createTaskId(),
        title: title,
        subject: subject,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);

    if (!saveTasks()) {
        tasks.shift();
        return;
    }

    taskForm.reset();
    showMessage("");

    currentFilter = "all";
    updateActiveNavigation();
    renderTasks();

    taskTitleInput.focus();
});

// Create a unique ID for each task.
function createTaskId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString() +
        Math.random().toString(36).slice(2);
}

// Display tasks and update the dashboard.
function renderTasks() {
    taskList.replaceChildren();

    const completedCount = tasks.filter(task => task.completed).length;
    const pendingCount = tasks.length - completedCount;

    totalTasksElement.textContent = tasks.length;
    pendingTasksElement.textContent = pendingCount;
    completedTasksElement.textContent = completedCount;

    const filteredTasks = tasks.filter(task => {
        if (currentFilter === "pending") {
            return !task.completed;
        }

        if (currentFilter === "completed") {
            return task.completed;
        }

        return true;
    });

    taskCountElement.textContent =
        filteredTasks.length +
        (filteredTasks.length === 1 ? " task" : " tasks");

    emptyState.hidden = filteredTasks.length > 0;

    if (tasks.length === 0) {
        emptyState.querySelector("h3").textContent = "No tasks yet";

        emptyState.querySelector("p").textContent =
            "Add your first study task using the form above.";
    } else if (filteredTasks.length === 0) {
        emptyState.querySelector("h3").textContent = "No matching tasks";

        emptyState.querySelector("p").textContent =
            currentFilter === "pending"
                ? "You have no pending tasks. Great work!"
                : "You have not completed any tasks yet.";
    }

    filteredTasks.forEach(task => {
        const taskElement = document.createElement("article");
        taskElement.className = "task-item";

        if (task.completed) {
            taskElement.classList.add("is-completed");
        }

        // Completion checkbox.
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "complete-checkbox";
        checkbox.checked = task.completed;

        checkbox.setAttribute(
            "aria-label",
            task.completed
                ? "Mark task incomplete"
                : "Mark task complete"
        );

        checkbox.addEventListener("change", function () {
            toggleTask(task.id);
        });

        // Task details.
        const details = document.createElement("div");
        details.className = "task-details";

        const title = document.createElement("h3");
        title.textContent = task.title;

        const subject = document.createElement("p");
        subject.textContent = "Subject: " + task.subject;

        const status = document.createElement("span");
        status.className = task.completed
            ? "task-status status-completed"
            : "task-status status-pending";

        status.textContent = task.completed
            ? "Completed"
            : "Pending";

        details.append(title, subject, status);

        // Delete button.
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.setAttribute(
            "aria-label",
            "Delete task: " + task.title
        );

        deleteButton.addEventListener("click", function () {
            deleteTask(task.id);
        });

        taskElement.append(checkbox, details, deleteButton);
        taskList.appendChild(taskElement);
    });
}

// Mark a task complete or incomplete.
function toggleTask(taskId) {
    const task = tasks.find(item => item.id === taskId);

    if (!task) {
        return;
    }

    task.completed = !task.completed;

    if (!saveTasks()) {
        task.completed = !task.completed;
        renderTasks();
        return;
    }

    renderTasks();
}

// Delete a task.
function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(item => item.id === taskId);

    if (taskIndex === -1) {
        return;
    }

    const deletedTask = tasks[taskIndex];

    tasks.splice(taskIndex, 1);

    if (!saveTasks()) {
        tasks.splice(taskIndex, 0, deletedTask);
        renderTasks();
        return;
    }

    showMessage("Task deleted successfully.");
    renderTasks();
}

// Filter tasks using the sidebar.
navigationButtons.forEach(button => {
    button.addEventListener("click", function () {
        currentFilter = button.dataset.filter;

        updateActiveNavigation();
        updateHeading();
        renderTasks();
    });
});

// Highlight the active navigation item.
function updateActiveNavigation() {
    navigationButtons.forEach(button => {
        const isActive = button.dataset.filter === currentFilter;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

// Update the list heading.
function updateHeading() {
    const headings = {
        all: "My Tasks",
        pending: "Pending Tasks",
        completed: "Completed Tasks"
    };

    listHeading.textContent = headings[currentFilter] || "My Tasks";
}

// Initial display.
updateActiveNavigation();
updateHeading();
renderTasks();

