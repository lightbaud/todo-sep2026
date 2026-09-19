const STORAGE_KEY = "todo-tasks";
const THEME_KEY = "todo-theme";
const WALLPAPER_KEY = "todo-wallpaper";
const PRIORITIES = Object.freeze(["high", "medium", "low"]);
const DEFAULT_PRIORITY = "medium";
const THEMES = Object.freeze(["light", "pastel", "dark"]);
const DEFAULT_THEME = "light";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TOAST_MS = 6000;

const WALLPAPERS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)",
  "linear-gradient(135deg, #2e2e78 0%, #662d8c 100%)",
  "linear-gradient(135deg, #0093e9 0%, #80d0c7 100%)"
];

const form = document.getElementById("add-form");
const input = document.getElementById("new-task");
const priorityInput = document.getElementById("new-priority");
const dueInput = document.getElementById("new-due");
const searchInput = document.getElementById("search");
const priorityFilterGroup = document.getElementById("priority-filter");
const list = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const completedSection = document.getElementById("completed-section");
const completedHeading = document.getElementById("completed-heading");
const completedList = document.getElementById("completed-list");
const clearCompletedButton = document.getElementById("clear-completed");
const summary = document.getElementById("summary");
const themeSwitcher = document.getElementById("theme-switcher");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toast-text");
const toastUndo = document.getElementById("toast-undo");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const wallpaperEl = document.getElementById("wallpaper");
const wallpaperBtn = document.getElementById("wallpaper-btn");

let tasks = load();
let theme = loadTheme();

// View state (not saved).
let editingId = null;
let focusEditNext = false;
let searchText = "";
let priorityFilter = "all";
let lastRemoved = null;
let toastTimer = null;
let draggedTask = null;
let draggedIndex = null;
let wallpaperIndex = 0;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    // Tasks saved before priorities or due dates existed get defaults for those fields.
    // Use whitelist to prevent prototype pollution attacks.
    return saved.map((t) => ({
      id: t.id,
      text: t.text,
      done: Boolean(t.done),
      priority: PRIORITIES.includes(t.priority) ? t.priority : DEFAULT_PRIORITY,
      due: typeof t.due === "string" && DATE_PATTERN.test(t.due) ? t.due : null,
    }));
  } catch {
    return [];
  }
}

function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    // Anything unrecognised, including the old "default" value, means light.
    return THEMES.includes(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme() {
  if (theme === DEFAULT_THEME) {
    delete document.body.dataset.theme;
  } else {
    document.body.dataset.theme = theme;
  }
  for (const button of themeSwitcher.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
  }
}

function setTheme(name) {
  if (!THEMES.includes(name)) return;
  theme = name;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage unavailable; the theme applies for this session only.
  }
  applyTheme();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    // Storage unavailable; tasks stay in memory for this session only.
    if (e.name === "QuotaExceededError") {
      showToast("⚠️ Storage full! Some tasks may not be saved.");
    }
  }
}

// Today as a local YYYY-MM-DD string, comparable with the value of a date input.
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

function formatDue(due) {
  const [year, month, day] = due.split("-").map(Number);
  const options = { month: "short", day: "numeric" };
  if (year !== new Date().getFullYear()) options.year = "numeric";
  return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
}

// Priority first, then earliest due date (no date last). Sort is stable, so ties keep added order.
function compareTasks(a, b) {
  const byPriority = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
  if (byPriority !== 0) return byPriority;
  if (a.due === b.due) return 0;
  if (a.due === null) return 1;
  if (b.due === null) return -1;
  return a.due < b.due ? -1 : 1;
}

function matchesView(task) {
  if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
  return task.text.toLowerCase().includes(searchText);
}

function createEditItem(task) {
  const li = document.createElement("li");
  li.className = "editing";

  const textField = document.createElement("input");
  textField.type = "text";
  textField.className = "edit-text";
  textField.value = task.text;
  textField.maxLength = 500;
  textField.autocomplete = "off";
  textField.setAttribute("aria-label", "Task text");

  const dueField = document.createElement("input");
  dueField.type = "date";
  dueField.className = "edit-due";
  dueField.value = task.due || "";
  dueField.setAttribute("aria-label", "Due date");

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => saveEdit(task.id, textField.value, dueField.value));

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "link-button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", cancelEdit);

  li.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit(task.id, textField.value, dueField.value);
    } else if (event.key === "Escape") {
      cancelEdit();
    }
  });

  li.append(textField, dueField, saveButton, cancelButton);
  return li;
}

function createItem(task) {
  if (task.id === editingId) return createEditItem(task);

  const li = document.createElement("li");
  if (task.done) li.classList.add("done");
  li.draggable = true;
  li.dataset.taskId = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "task-" + task.id;
  checkbox.checked = task.done;
  checkbox.addEventListener("change", () => toggle(task.id));

  const label = document.createElement("label");
  label.htmlFor = checkbox.id;
  label.textContent = task.text;

  li.append(checkbox, label);

  // Drag event handlers
  li.addEventListener("dragstart", (e) => {
    draggedTask = task;
    draggedIndex = tasks.indexOf(task);
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  li.addEventListener("dragend", () => {
    document.querySelectorAll("li").forEach(item => item.classList.remove("dragging", "drag-over"));
  });

  li.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedTask && draggedTask.id !== task.id) {
      li.classList.add("drag-over");
    }
  });

  li.addEventListener("dragleave", () => {
    li.classList.remove("drag-over");
  });

  li.addEventListener("drop", (e) => {
    e.preventDefault();
    if (draggedTask && draggedTask.id !== task.id) {
      swapTasks(draggedIndex, tasks.indexOf(task));
      li.classList.remove("drag-over");
    }
  });

  if (task.due) {
    const overdue = !task.done && task.due < todayString();
    const chip = document.createElement("span");
    chip.className = "due" + (overdue ? " overdue" : "");
    chip.textContent = (overdue ? "Overdue " : "Due ") + formatDue(task.due);
    li.append(chip);
  }

  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = "priority priority-" + task.priority;
  badge.textContent = task.priority;
  badge.title = "Click to change priority";
  badge.setAttribute("aria-label", "Priority " + task.priority + ": " + task.text + ". Click to change.");
  badge.addEventListener("click", () => cyclePriority(task.id));

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "icon-button";
  edit.textContent = "✎";
  edit.title = "Edit task";
  edit.setAttribute("aria-label", "Edit task: " + task.text);
  edit.addEventListener("click", () => startEdit(task.id));

  const del = document.createElement("button");
  del.type = "button";
  del.className = "icon-button delete";
  del.textContent = "×";
  del.title = "Delete task";
  del.setAttribute("aria-label", "Delete task: " + task.text);
  del.addEventListener("click", () => removeTasks([task.id]));

  li.append(badge, edit, del);
  return li;
}

function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const percentage = total === 0 ? 0 : (completed / total) * 100;

  progressFill.style.width = percentage + "%";

  if (total === 0) {
    progressText.textContent = "No tasks yet";
  } else if (completed === total) {
    progressText.textContent = "🎉 All tasks completed!";
  } else {
    progressText.textContent = completed + " of " + total + " completed";
  }
}

function render() {
  list.innerHTML = "";
  completedList.innerHTML = "";

  const visible = [...tasks].filter(matchesView).sort(compareTasks);
  const active = visible.filter((t) => !t.done);
  const completed = visible.filter((t) => t.done);

  list.append(...active.map(createItem));
  completedList.append(...completed.map(createItem));

  completedSection.hidden = completed.length === 0;
  completedHeading.textContent = "Completed (" + completed.length + ")";

  const remaining = tasks.filter((t) => !t.done).length;
  if (tasks.length === 0) {
    emptyMessage.textContent = "Nothing to do yet.";
  } else if (remaining === 0) {
    emptyMessage.textContent = "All done! 🎉";
  } else {
    emptyMessage.textContent = "No tasks match.";
  }
  emptyMessage.hidden = active.length > 0;

  summary.textContent = tasks.length === 0
    ? ""
    : remaining + (remaining === 1 ? " task" : " tasks") + " remaining";

  updateProgress();

  if (focusEditNext) {
    focusEditNext = false;
    const field = list.querySelector(".edit-text") || completedList.querySelector(".edit-text");
    if (field) {
      field.focus();
      field.select();
    }
  }
}

function add(text, priority, due) {
  // Generate unique ID combining timestamp and random entropy to avoid collisions.
  const id = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  tasks.push({ id, text, done: false, priority, due });
  save();
  render();
}

function swapTasks(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const [task] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, task);
  draggedTask = null;
  draggedIndex = null;
  save();
  render();
}

function initWallpaperStyles() {
  // Apply wallpaper container styles (CSS may not load from file://)
  const wallpaper = document.getElementById("wallpaper");
  const overlay = document.querySelector(".wallpaper-overlay");

  Object.assign(wallpaper.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    zIndex: "-2"
  });

  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.3)",
    zIndex: "-1"
  });
}

function initWallpaper() {
  const saved = parseInt(localStorage.getItem(WALLPAPER_KEY)) || 0;
  wallpaperIndex = Math.min(saved, WALLPAPERS.length - 1);
  setWallpaper();
}

function setWallpaper() {
  const gradient = WALLPAPERS[wallpaperIndex % WALLPAPERS.length];
  wallpaperEl.style.background = gradient;
  try {
    localStorage.setItem(WALLPAPER_KEY, wallpaperIndex);
  } catch {
    // Storage unavailable
  }
}

function changeWallpaper() {
  wallpaperIndex = (wallpaperIndex + 1) % WALLPAPERS.length;
  setWallpaper();
  showToast("✨ Wallpaper changed");
}

function startEdit(id) {
  editingId = id;
  focusEditNext = true;
  render();
}

function cancelEdit() {
  editingId = null;
  render();
}

function saveEdit(id, text, due) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    // An empty text keeps the old wording rather than blanking the task.
    const trimmed = text.trim().normalize("NFC");
    if (trimmed) task.text = trimmed;
    task.due = DATE_PATTERN.test(due) ? due : null;
  }
  editingId = null;
  save();
  render();
}

function cyclePriority(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.priority = PRIORITIES[(PRIORITIES.indexOf(task.priority) + 1) % PRIORITIES.length];
  }
  save();
  render();
}

function toggle(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  save();
  render();
}

// Removes tasks but remembers them (with their positions) so Undo can put them back.
function removeTasks(ids) {
  const removed = [];
  tasks.forEach((task, index) => {
    if (ids.includes(task.id)) removed.push({ task, index });
  });
  if (removed.length === 0) return;

  tasks = tasks.filter((t) => !ids.includes(t.id));
  if (ids.includes(editingId)) editingId = null;
  lastRemoved = removed;
  save();
  render();
  showToast(removed.length === 1 ? "Task deleted." : removed.length + " tasks cleared.");
}

function undoRemove() {
  if (!lastRemoved) return;
  // Re-insert in ascending index order so each task lands back where it was.
  for (const { task, index } of lastRemoved) {
    tasks.splice(Math.min(index, tasks.length), 0, task);
  }
  lastRemoved = null;
  hideToast();
  save();
  render();
}

function showToast(message) {
  toastText.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, TOAST_MS);
}

function hideToast() {
  clearTimeout(toastTimer);
  toast.hidden = true;
  lastRemoved = null;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim().normalize("NFC");
  if (!text) return;
  add(text, priorityInput.value, dueInput.value || null);
  input.value = "";
  priorityInput.value = DEFAULT_PRIORITY;
  dueInput.value = "";
  input.focus();
});

searchInput.addEventListener("input", () => {
  searchText = searchInput.value.trim().toLowerCase();
  render();
});

priorityFilterGroup.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  priorityFilter = button.dataset.filter;
  for (const chip of priorityFilterGroup.querySelectorAll("button")) {
    chip.setAttribute("aria-pressed", String(chip === button));
  }
  render();
});

clearCompletedButton.addEventListener("click", () => {
  // Clears the completed tasks currently shown, so an active search or filter narrows it.
  const ids = tasks.filter((t) => t.done && matchesView(t)).map((t) => t.id);
  removeTasks(ids);
});

toastUndo.addEventListener("click", undoRemove);

themeSwitcher.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-theme-choice]");
  if (button) setTheme(button.dataset.themeChoice);
});

wallpaperBtn.addEventListener("click", changeWallpaper);

// Sync tasks across browser tabs to prevent data loss from concurrent editing.
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    tasks = load();
    render();
  }
});

applyTheme();
initWallpaperStyles();
initWallpaper();
render();
