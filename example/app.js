import { batch, bind, computed, effect, keyed, resource, scope, signal, template } from "./runtime/index.js";
import { badge, button, card, checkbox, icon, input } from "./ui/index.js";
import { plus, trash2 } from "./ui/icons/index.js";

/** @typedef {{ id: string, title: string, completed: boolean }} Todo */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "done", label: "Done" },
];

const filterTemplate = template(`
  <div data-ref="root"></div>
`);

const todoTemplate = template(`
  <li class="todo" data-ref="root">
    <span data-ref="toggleSlot"></span>
    <span class="todo__label" data-ref="label"></span>
    <span class="todo__remove" data-ref="removeSlot"></span>
  </li>
`);

const root = document.querySelector("#app");
if (!(root instanceof HTMLElement)) {
  throw new Error("missing #app root");
}

const page = scope();
const app = document.createElement("main");
app.className = "app";
root.replaceChildren(app);
page.onCleanup(() => {
  app.remove();
});

const heroSummary = document.createElement("div");
const heroSyncStatus = document.createElement("div");
const heroStats = document.createElement("div");
heroStats.className = "hero__stats";
heroStats.append(heroSummary, heroSyncStatus);

const hero = document.createElement("section");
hero.className = "hero";
const heroText = document.createElement("div");
const heroTitle = document.createElement("h1");
heroTitle.className = "hero__title";
heroTitle.textContent = "todo app";
const heroDescription = document.createElement("p");
heroDescription.className = "hero__description";
heroDescription.textContent = "Simple server-client example using wd runtime and ui primitives.";
heroText.append(heroTitle, heroDescription);
hero.append(heroText, heroStats);
app.append(card({ body: hero }).root);

const SYNCING_MESSAGE_DELAY_MS = 300;

const composerForm = document.createElement("form");
composerForm.className = "composer";
const draftInput = input({
  name: "title",
  autocomplete: "off",
  placeholder: "What needs doing?",
});
const submitButton = button({
  label: "Add todo",
  type: "submit",
  start: icon(plus),
});
composerForm.append(draftInput, submitButton);
app.append(card({ body: composerForm }).root);

const filters = document.createElement("div");
filters.className = "filters";
const toolbarMessage = document.createElement("p");
toolbarMessage.className = "toolbar__message";
const toolbar = document.createElement("div");
toolbar.className = "toolbar";
toolbar.append(filters, toolbarMessage);

const empty = document.createElement("p");
empty.className = "empty";
empty.hidden = true;
empty.textContent = "No todos in this filter.";

const list = document.createElement("ul");
list.className = "list";

const footerSummary = document.createElement("span");
const clearDoneButton = button({
  label: "Clear completed",
  variant: "ghost",
  size: "sm",
  start: icon(trash2),
});
const footer = document.createElement("footer");
footer.className = "footer";
footer.append(footerSummary, clearDoneButton);

const listBody = document.createElement("div");
listBody.append(toolbar, empty, list, footer);
app.append(card({ body: listBody }).root);

const todos = signal(/** @type {Todo[]} */ ([]));
const draft = signal("");
const filter = signal("all");
const mutationCount = signal(0);
const errorMessage = signal("");
const syncingVisible = signal(false);

const todosQuery = resource(page, async (abortSignal) => {
  const response = await fetch("/api/todos", { signal: abortSignal });
  if (!response.ok) {
    throw new Error(`failed to load todos: ${response.status}`);
  }
  return /** @type {Promise<Todo[]>} */ (response.json());
}, {
  initialValue: [],
});

const activeCount = computed(() => todos().filter((todo) => !todo.completed).length);
const completedCount = computed(() => todos().filter((todo) => todo.completed).length);
const visibleTodos = computed(() => {
  const mode = filter();
  const all = todos();
  if (mode === "active") {
    return all.filter((todo) => !todo.completed);
  }
  if (mode === "done") {
    return all.filter((todo) => todo.completed);
  }
  return all;
});
const busy = computed(() => todosQuery.loading() || mutationCount() > 0);

function setError(error) {
  const message = error instanceof Error ? error.message : String(error);
  errorMessage.set(message);
}

function clearError() {
  errorMessage.set("");
}

async function refreshTodos() {
  clearError();
  try {
    const next = await todosQuery.reload();
    if (next !== null) {
      todos.set(next);
    }
  } catch (error) {
    setError(error);
  }
}

async function mutate(run) {
  mutationCount.update((count) => count + 1);
  clearError();
  try {
    await run();
    await refreshTodos();
  } catch (error) {
    setError(error);
  } finally {
    mutationCount.update((count) => count - 1);
  }
}

async function request(path, init) {
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload && typeof payload.error === "string"
      ? payload.error
      : `request failed: ${response.status}`;
    throw new Error(message);
  }
  return response;
}

function createTodo(title) {
  return mutate(async () => {
    await request("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    draft.set("");
  });
}

function toggleTodo(todo) {
  return mutate(async () => {
    await request(`/api/todos/${encodeURIComponent(todo.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !todo.completed }),
    });
  });
}

function deleteTodo(todo) {
  return mutate(async () => {
    await request(`/api/todos/${encodeURIComponent(todo.id)}`, {
      method: "DELETE",
    });
  });
}

function clearCompleted() {
  return mutate(async () => {
    const done = todos().filter((todo) => todo.completed);
    await Promise.all(done.map((todo) => {
      return request(`/api/todos/${encodeURIComponent(todo.id)}`, {
        method: "DELETE",
      });
    }));
  });
}

bind.text(heroSummary, () => {
  const total = todos().length;
  return `${total} total • ${activeCount()} active • ${completedCount()} done`;
}, { scope: page });

bind.text(heroSyncStatus, () => syncingVisible() ? "Syncing…" : "Synced", { scope: page });
bind.input(draftInput, draft, { scope: page });
bind.prop(submitButton, "disabled", () => busy() || draft().trim().length === 0, { scope: page });
bind.text(toolbarMessage, errorMessage, { scope: page });
bind.classToggle(toolbarMessage, "is-error", () => errorMessage().length > 0, { scope: page });
bind.show(empty, () => visibleTodos().length === 0, { scope: page });
bind.text(footerSummary, () => {
  const count = activeCount();
  return count === 1 ? "1 item left" : `${count} items left`;
}, { scope: page });
bind.prop(clearDoneButton, "disabled", () => completedCount() === 0 || busy(), { scope: page });

page.listen(composerForm, "submit", (event) => {
  event.preventDefault();
  const title = draft().trim();
  if (title.length === 0) {
    return;
  }
  void createTodo(title);
});

keyed(filters, FILTERS, (entry) => entry.id, (entry, rowScope) => {
  const slot = filterTemplate.clone();
  const control = button({ label: entry().label, variant: "ghost", size: "sm" });
  slot.root.append(control);
  bind.prop(control, "className", () => [
    "ui-button",
    filter() === entry().id ? "ui-button--secondary" : "ui-button--ghost",
    "ui-button--sm",
  ].join(" "), { scope: rowScope });
  rowScope.listen(control, "click", () => {
    filter.set(entry().id);
  });
  return slot.root;
}, { scope: page });

keyed(list, visibleTodos, (todo) => todo.id, (todo, rowScope) => {
  const row = todoTemplate.clone();
  const toggle = checkbox({ ariaLabel: "Toggle todo" });
  const remove = button({
    variant: "ghost",
    size: "icon-sm",
    ariaLabel: "Delete todo",
    start: icon(trash2),
  });
  row.refs.toggleSlot.append(toggle);
  row.refs.removeSlot.append(remove);

  bind.text(row.refs.label, () => todo().title, { scope: rowScope });
  bind.classToggle(row.refs.root, "is-done", () => todo().completed, { scope: rowScope });
  bind.checked(toggle, () => todo().completed, { scope: rowScope });

  rowScope.listen(toggle, "change", () => {
    void toggleTodo(todo());
  });
  rowScope.listen(remove, "click", () => {
    void deleteTodo(todo());
  });
  return row.root;
}, { scope: page });

page.listen(clearDoneButton, "click", () => {
  if (completedCount() === 0) {
    return;
  }
  void clearCompleted();
});

effect(() => {
  const state = todosQuery.state();
  if (state.status === "ready" && Array.isArray(state.value)) {
    batch(() => {
      todos.set(state.value);
      if (errorMessage()) {
        clearError();
      }
    });
  }
}, { scope: page });

effect(() => {
  syncingVisible.set(false);
  if (!busy()) {
    return;
  }
  return page.timeout(SYNCING_MESSAGE_DELAY_MS, () => {
    if (busy()) {
      syncingVisible.set(true);
    }
  });
}, { scope: page });
