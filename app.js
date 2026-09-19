"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const URL =
    "https://ncylczvijvdaiaamhmwk.supabase.co";

const KEY =
    "sb_publishable_hNUwSYtyf0jU7ARbvai3gw_1xbNlyMe";

const ADMIN_EMAIL =
    "mosesntella2018@gmail.com";

const ADMIN_USERNAME =
    "ADMIN";

const ADMIN_PASSWORD =
    "Hotpoint_Tools";

/* =========================================================
   APPLICATION DATA
   ========================================================= */

let token =
    localStorage.getItem("hp_access") || "";

let tools = [];
let history = [];

/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

const $ = selector =>
    document.querySelector(selector);

const escapeHTML = value => {
    return String(value ?? "").replace(
        /[&<>'"]/g,
        character => {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            }[character];
        }
    );
};

const formatDate = value => {
    if (!value) {
        return "—";
    }

    return new Date(
        `${value}T00:00:00`
    ).toLocaleDateString("en-GB");
};

const today = () =>
    new Date().toISOString().slice(0, 10);

/* =========================================================
   SUPABASE REQUEST HEADERS
   ========================================================= */

function createHeaders(admin = false) {
    return {
        apikey: KEY,

        Authorization:
            `Bearer ${
                admin && token
                    ? token
                    : KEY
            }`,

        "Content-Type": "application/json"
    };
}

/* =========================================================
   USER MESSAGES
   ========================================================= */

function showMessage(text, type = "ok") {
    const message = $("#message");

    message.textContent = text;
    message.className = type;

    setTimeout(() => {
        message.textContent = "";
        message.className = "";
    }, 4500);
}

/* =========================================================
   SUPABASE API REQUEST
   Handles empty responses without producing a JSON error.
   ========================================================= */

async function api(path, options = {}) {
    const response = await fetch(
        URL + path,
        {
            ...options,

            headers: {
                ...createHeaders(options.admin),
                ...(options.headers || {})
            }
        }
    );

    if (
        response.status === 401 &&
        options.admin
    ) {
        token = "";

        localStorage.removeItem("hp_access");

        showAuthentication();
    }

    /*
     * Supabase may return an empty response after a
     * successful INSERT, UPDATE or DELETE operation.
     */

    const responseText =
        await response.text();

    let responseData = null;

    if (responseText) {
        try {
            responseData =
                JSON.parse(responseText);
        } catch (error) {
            responseData = responseText;
        }
    }

    if (!response.ok) {
        const errorData =
            responseData &&
            typeof responseData === "object"
                ? responseData
                : {};

        throw new Error(
            errorData.message ||
            errorData.error_description ||
            errorData.details ||
            `Request failed (${response.status})`
        );
    }

    return responseData;
}

/* =========================================================
   LOAD SHARED DATA
   ========================================================= */

async function loadData() {
    try {
        const requests = await Promise.all([
            api(
                "/rest/v1/tools" +
                "?select=*" +
                "&order=name"
            ),

            api(
                "/rest/v1/tool_history" +
                "?select=*" +
                "&order=assigned_on.desc,created_at.desc"
            )
        ]);

        tools = requests[0] || [];
        history = requests[1] || [];

        localStorage.setItem(
            "hp_cache",
            JSON.stringify({
                tools,
                history
            })
        );

        renderApplication();
    } catch (error) {
        const cachedData = JSON.parse(
            localStorage.getItem("hp_cache") ||
            "null"
        );

        if (cachedData) {
            tools = cachedData.tools || [];
            history = cachedData.history || [];

            renderApplication();

            showMessage(
                "Offline: showing the last synchronized records.",
                "error"
            );
        } else {
            showMessage(
                error.message,
                "error"
            );
        }
    }
}

/* =========================================================
   ACTIVE ALLOCATIONS
   ========================================================= */

function getActiveAllocations() {
    return history.filter(record => {
        return !record.ended_on;
    });
}

/* =========================================================
   RENDER APPLICATION
   ========================================================= */

function renderApplication() {
    const allocations =
        getActiveAllocations();

    const searchText =
        $("#search").value.toLowerCase();

    const totalUnits = tools.reduce(
        (total, tool) => {
            return total + tool.quantity;
        },
        0
    );

    $("#total").textContent =
        totalUnits;

    $("#out").textContent =
        allocations.length;

    $("#free").textContent =
        Math.max(
            0,
            totalUnits - allocations.length
        );

    renderPublicTools(
        allocations,
        searchText
    );

    renderHistory();

    renderToolOptions(allocations);

    renderActiveAllocations(allocations);

    renderToolManagement(allocations);
}

/* =========================================================
   RENDER PUBLIC TOOLS
   ========================================================= */

function renderPublicTools(
    allocations,
    searchText
) {
    const matchingTools = tools.filter(tool => {
        const toolAllocations =
            allocations.filter(record => {
                return (
                    record.tool_id === tool.id
                );
            });

        const searchableText = `
            ${tool.name}
            ${tool.description}
            ${toolAllocations.map(record => record.tool_number || "").join(" ")}
            ${toolAllocations.map(record => {
                return (
                    record.technician +
                    " " +
                    record.site
                );
            }).join(" ")}
        `.toLowerCase();

        return searchableText.includes(
            searchText
        );
    });

    $("#tools").innerHTML =
        matchingTools.map(tool => {
            const toolAllocations =
                allocations.filter(record => {
                    return (
                        record.tool_id ===
                        tool.id
                    );
                });

            const availableQuantity =
                Math.max(
                    0,
                    tool.quantity -
                    toolAllocations.length
                );

            return `
                <article class="tool">
                    <h3>
                        ${escapeHTML(tool.name)}
                    </h3>

                    <small>
                        ${escapeHTML(
                            tool.description
                        )}
                    </small>

                    <div class="counts">
                        <span>
                            Total: ${tool.quantity}
                        </span>

                        <span>
                            Free: ${availableQuantity}
                        </span>

                        <span>
                            Out: ${toolAllocations.length}
                        </span>
                    </div>

                    ${toolAllocations.map(record => {
                        return `
                            <div class="holder">
                                <b>
                                    ${escapeHTML(
                                        record.technician
                                    )}
                                </b>

                                <br>

                                <small>
                                    Tool No: ${escapeHTML(
                                        record.tool_number || "Not recorded"
                                    )}
                                    •
                                    ${escapeHTML(
                                        record.site
                                    )}
                                    •
                                    ${formatDate(
                                        record.assigned_on
                                    )}
                                </small>
                            </div>
                        `;
                    }).join("")}
                </article>
            `;
        }).join("") ||
        "No matching tools.";
}

/* =========================================================
   RENDER HISTORY
   ========================================================= */

function renderHistory() {
    $("#history").innerHTML =
        history.map(record => {
            const tool = tools.find(item => {
                return (
                    item.id === record.tool_id
                );
            });

            return `
                <tr>
                    <td>
                        ${escapeHTML(
                            record.technician
                        )}
                    </td>

                    <td>
                        ${escapeHTML(record.site)}
                    </td>

                    <td>
                        ${escapeHTML(
                            tool?.name ||
                            "Removed tool"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.tool_number ||
                            "Not recorded"
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            record.assigned_on
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            record.ended_on
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.action
                        )}
                    </td>
                </tr>
            `;
        }).join("");
}

/* =========================================================
   RENDER ASSIGNMENT DROPDOWN
   ========================================================= */

function renderToolOptions(allocations) {
    const availableTools =
        tools.filter(tool => {
            const allocationCount =
                allocations.filter(record => {
                    return (
                        record.tool_id ===
                        tool.id
                    );
                }).length;

            return (
                allocationCount <
                tool.quantity
            );
        });

    $("#toolSelect").innerHTML =
        availableTools.map(tool => {
            return `
                <option value="${tool.id}">
                    ${escapeHTML(tool.name)}
                </option>
            `;
        }).join("");

}

/* =========================================================
   RENDER ACTIVE ALLOCATIONS
   ========================================================= */

function renderActiveAllocations(
    allocations
) {
    $("#active").innerHTML =
        allocations.map(record => {
            const tool = tools.find(item => {
                return (
                    item.id ===
                    record.tool_id
                );
            });

            return `
                <div class="allocation">
                    <span class="managed-tool-heading">
                        <b>
                            ${escapeHTML(
                                tool?.name ||
                                "Tool"
                            )}
                        </b>

                        <br>

                        <small>
                            Tool No: ${escapeHTML(
                                record.tool_number ||
                                "Not recorded"
                            )}
                        </small>

                        <br>

                        ${escapeHTML(
                            record.technician
                        )}
                        •
                        ${escapeHTML(record.site)}
                        •
                        ${formatDate(
                            record.assigned_on
                        )}
                    </span>

                    <div class="actions">
                        <button
                            data-transfer="${record.id}"
                        >
                            Transfer
                        </button>

                        <button
                            class="dark"
                            data-release="${record.id}"
                        >
                            Release
                        </button>
                    </div>
                </div>
            `;
        }).join("") ||
        "No tools are currently allocated.";
}

/* =========================================================
   RENDER TOOL MANAGEMENT
   ========================================================= */

function renderToolManagement(
    allocations
) {
    $("#manageTools").innerHTML =
        tools.map(tool => {
            const allocatedQuantity =
                allocations.filter(record => {
                    return (
                        record.tool_id ===
                        tool.id
                    );
                }).length;

            const disabled =
                allocatedQuantity > 0;

            return `
                <div class="managed-tool">
                    <span>
                        <b>
                            ${escapeHTML(tool.name)}
                        </b>

                        <small>
                            ${tool.quantity} total
                            •
                            ${allocatedQuantity}
                            currently allocated
                        </small>
                    </span>

                    <p class="managed-tool-description">
                        ${escapeHTML(
                            tool.description ||
                            "No description added."
                        )}
                    </p>

                    <div class="managed-tool-actions">
                        <button
                            type="button"
                            data-edit-name="${tool.id}"
                        >
                            Edit Name
                        </button>

                        <button
                            type="button"
                            data-edit-quantity="${tool.id}"
                        >
                            Edit Quantity
                        </button>

                        <button
                            type="button"
                            data-edit-description="${tool.id}"
                        >
                            Edit Description
                        </button>

                        <button
                            type="button"
                            class="remove"
                            data-remove-tool="${tool.id}"
                            data-tool-name="${escapeHTML(
                                tool.name
                            )}"
                            ${
                                disabled
                                    ? `disabled title="Release allocated units first"`
                                    : ""
                            }
                        >
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join("") ||
        "No tools have been added.";
}

/* =========================================================
   AUTHENTICATION DISPLAY
   ========================================================= */

function showAuthentication() {
    const loggedIn = Boolean(token);

    $("#login").hidden = loggedIn;
    $("#adminPanel").hidden = !loggedIn;
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

document
    .querySelectorAll("nav button")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                document
                    .querySelectorAll(
                        "nav button"
                    )
                    .forEach(item => {
                        item.classList.remove(
                            "active"
                        );
                    });

                button.classList.add(
                    "active"
                );

                const adminPage =
                    button.dataset.view ===
                    "admin";

                $("#publicView").hidden =
                    adminPage;

                $("#adminView").hidden =
                    !adminPage;

                showAuthentication();
            }
        );
    });

/* =========================================================
   DEFAULT VALUES
   ========================================================= */

$("#assignDate").value = today();
$("#transferDate").value = today();

/* =========================================================
   REFRESH AND SEARCH
   ========================================================= */

$("#refresh").addEventListener(
    "click",
    () => window.location.reload()
);

$("#search").addEventListener(
    "input",
    renderApplication
);

/* =========================================================
   ADMIN LOGIN
   ========================================================= */

$("#login").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const username =
            $("#username")
                .value
                .trim()
                .toUpperCase();

        const password =
            $("#password").value;

        if (
            username !== ADMIN_USERNAME ||
            password !== ADMIN_PASSWORD
        ) {
            showMessage(
                "Incorrect username or password.",
                "error"
            );

            return;
        }

        try {
            const response = await api(
                "/auth/v1/token" +
                "?grant_type=password",
                {
                    method: "POST",

                    body: JSON.stringify({
                        email: ADMIN_EMAIL,
                        password
                    })
                }
            );

            token = response.access_token;

            localStorage.setItem(
                "hp_access",
                token
            );

            showAuthentication();

            showMessage(
                "Administrator signed in."
            );

            await loadData();
        } catch (error) {
            showMessage(
                "Supabase rejected the login. " +
                "Set the admin user's " +
                "Supabase password to " +
                "Hotpoint_Tools.",
                "error"
            );
        }
    }
);

/* =========================================================
   ADMIN LOGOUT
   ========================================================= */

$("#logout").addEventListener(
    "click",
    () => {
        token = "";

        localStorage.removeItem(
            "hp_access"
        );

        showAuthentication();

        showMessage("Signed out.");
    }
);

/* =========================================================
   ADD TOOL
   ========================================================= */

$("#addTool").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const name =
            $("#toolName").value.trim();

        const quantity =
            Number($("#quantity").value);

        const description =
            $("#description").value.trim();

        if (
            !name ||
            !description ||
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            showMessage(
                "Enter a valid tool name, quantity and description.",
                "error"
            );

            return;
        }

        try {
            await api(
                "/rest/v1/tools",
                {
                    admin: true,
                    method: "POST",

                    headers: {
                        Prefer:
                            "return=minimal"
                    },

                    body: JSON.stringify({
                        name,
                        quantity,
                        description
                    })
                }
            );

            event.target.reset();

            $("#quantity").value = 1;

            showMessage(
                "Tool added successfully."
            );

            await loadData();
        } catch (error) {
            showMessage(
                error.message,
                "error"
            );
        }
    }
);

/* =========================================================
   REMOVE TOOL
   ========================================================= */

$("#manageTools").addEventListener(
    "click",
    async event => {
        const nameButton =
            event.target.closest(
                "[data-edit-name]"
            );

        if (nameButton) {
            const tool = tools.find(item => {
                return String(item.id) ===
                    String(
                        nameButton.dataset.editName
                    );
            });

            if (!tool) {
                return;
            }

            const enteredName = prompt(
                "Edit tool name:",
                tool.name
            );

            if (enteredName === null) {
                return;
            }

            const name = enteredName.trim();

            if (!name) {
                showMessage(
                    "The tool name cannot be empty.",
                    "error"
                );
                return;
            }

            try {
                await api(
                    `/rest/v1/tools?id=eq.${encodeURIComponent(tool.id)}`,
                    {
                        admin: true,
                        method: "PATCH",
                        headers: {
                            Prefer: "return=minimal"
                        },
                        body: JSON.stringify({ name })
                    }
                );

                showMessage(
                    "Tool name updated."
                );

                await loadData();
            } catch (error) {
                showMessage(
                    error.message,
                    "error"
                );
            }

            return;
        }

        const quantityButton =
            event.target.closest(
                "[data-edit-quantity]"
            );

        if (quantityButton) {
            const tool = tools.find(item => {
                return String(item.id) ===
                    String(
                        quantityButton.dataset
                            .editQuantity
                    );
            });

            if (!tool) {
                return;
            }

            const allocatedQuantity =
                getActiveAllocations()
                    .filter(record => {
                        return record.tool_id ===
                            tool.id;
                    }).length;

            const enteredQuantity = prompt(
                `Edit total quantity for ${tool.name}:`,
                tool.quantity
            );

            if (enteredQuantity === null) {
                return;
            }

            const quantity = Number(
                enteredQuantity.trim()
            );

            if (
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                showMessage(
                    "Enter a whole number of 1 or more.",
                    "error"
                );
                return;
            }

            if (quantity < allocatedQuantity) {
                showMessage(
                    `Quantity cannot be below ${allocatedQuantity} because ${allocatedQuantity} unit(s) are currently allocated.`,
                    "error"
                );
                return;
            }

            try {
                await api(
                    `/rest/v1/tools?id=eq.${encodeURIComponent(tool.id)}`,
                    {
                        admin: true,
                        method: "PATCH",
                        headers: {
                            Prefer: "return=minimal"
                        },
                        body: JSON.stringify({
                            quantity
                        })
                    }
                );

                showMessage(
                    "Tool quantity updated."
                );

                await loadData();
            } catch (error) {
                showMessage(
                    error.message,
                    "error"
                );
            }

            return;
        }

        const editButton =
            event.target.closest(
                "[data-edit-description]"
            );

        if (editButton) {
            const tool = tools.find(item => {
                return String(item.id) ===
                    String(
                        editButton.dataset
                            .editDescription
                    );
            });

            if (!tool) {
                return;
            }

            const description = prompt(
                `Edit the description for ${tool.name}:`,
                tool.description || ""
            );

            if (description === null) {
                return;
            }

            const cleanDescription =
                description.trim();

            if (!cleanDescription) {
                showMessage(
                    "The tool description cannot be empty.",
                    "error"
                );
                return;
            }

            try {
                const toolId = encodeURIComponent(
                    tool.id
                );

                await api(
                    `/rest/v1/tools?id=eq.${toolId}`,
                    {
                        admin: true,
                        method: "PATCH",
                        headers: {
                            Prefer: "return=minimal"
                        },
                        body: JSON.stringify({
                            description:
                                cleanDescription
                        })
                    }
                );

                showMessage(
                    "Tool description updated."
                );

                await loadData();
            } catch (error) {
                showMessage(
                    error.message,
                    "error"
                );
            }

            return;
        }

        const button =
            event.target.closest(
                "[data-remove-tool]"
            );

        if (!button || button.disabled) {
            return;
        }

        const toolName =
            button.dataset.toolName;

        const shouldRemove = confirm(
            `Remove ${toolName}?`
        );

        if (!shouldRemove) {
            return;
        }

        try {
            const toolId =
                encodeURIComponent(
                    button.dataset.removeTool
                );

            await api(
                `/rest/v1/tools?id=eq.${toolId}`,
                {
                    admin: true,
                    method: "DELETE",

                    headers: {
                        Prefer:
                            "return=minimal"
                    }
                }
            );

            showMessage(
                `${toolName} removed.`
            );

            await loadData();
        } catch (error) {
            const errorMessage =
                /foreign key|violates/i.test(
                    error.message
                )
                    ? (
                        "This tool has allocation " +
                        "history and cannot be " +
                        "permanently deleted."
                    )
                    : error.message;

            showMessage(
                errorMessage,
                "error"
            );
        }
    }
);

/* =========================================================
   ASSIGN TOOL
   ========================================================= */

$("#assign").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        try {
            const selectedToolId =
                $("#toolSelect").value;

            const toolNumber =
                $("#assignToolNumber")
                    .value
                    .trim();

            if (!selectedToolId || !toolNumber) {
                showMessage(
                    "Select a tool and enter its tool number.",
                    "error"
                );
                return;
            }

            await api(
                "/rest/v1/rpc/assign_tool",
                {
                    admin: true,
                    method: "POST",

                    body: JSON.stringify({
                        p_tool_id:
                            selectedToolId,

                        p_technician:
                            $("#technician")
                                .value
                                .trim(),

                        p_site:
                            $("#site")
                                .value
                                .trim(),

                        p_date:
                            $("#assignDate").value
                    })
                }
            );

            const newAllocations = await api(
                "/rest/v1/tool_history" +
                `?tool_id=eq.${encodeURIComponent(selectedToolId)}` +
                `&technician=eq.${encodeURIComponent($("#technician").value.trim())}` +
                `&site=eq.${encodeURIComponent($("#site").value.trim())}` +
                `&assigned_on=eq.${encodeURIComponent($("#assignDate").value)}` +
                "&ended_on=is.null" +
                "&order=created_at.desc&limit=1"
            );

            if (!newAllocations?.[0]?.id) {
                throw new Error("The allocation was created, but its tool number could not be saved.");
            }

            await api(
                `/rest/v1/tool_history?id=eq.${encodeURIComponent(newAllocations[0].id)}`,
                {
                    admin: true,
                    method: "PATCH",
                    headers: { Prefer: "return=minimal" },
                    body: JSON.stringify({
                        tool_number: toolNumber
                    })
                }
            );

            event.target.reset();

            $("#assignDate").value =
                today();

            showMessage(
                "Tool assigned successfully."
            );

            await loadData();
        } catch (error) {
            showMessage(
                error.message,
                "error"
            );
        }
    }
);

/* =========================================================
   RELEASE OR OPEN TRANSFER
   ========================================================= */

$("#active").addEventListener(
    "click",
    async event => {
        const releaseId =
            event.target.dataset.release;

        const transferId =
            event.target.dataset.transfer;

        if (
            releaseId &&
            confirm("Release this tool?")
        ) {
            try {
                await api(
                    "/rest/v1/rpc/release_tool",
                    {
                        admin: true,
                        method: "POST",

                        body: JSON.stringify({
                            p_history_id:
                                releaseId,

                            p_date: today()
                        })
                    }
                );

                showMessage(
                    "Tool released."
                );

                await loadData();
            } catch (error) {
                showMessage(
                    error.message,
                    "error"
                );
            }
        }

        if (transferId) {
            const allocation =
                history.find(record => {
                    return (
                        record.id ===
                        transferId
                    );
                });

            if (!allocation) {
                return;
            }

            $("#historyId").value =
                transferId;

            $("#transferText").textContent =
                `Transfer from ` +
                `${allocation.technician} ` +
                `at ${allocation.site}`;

            $("#transferDate").value =
                today();

            $("#transfer").showModal();
        }
    }
);

/* =========================================================
   CANCEL TRANSFER
   ========================================================= */

$("#cancel").addEventListener(
    "click",
    () => {
        $("#transfer").close();
    }
);

/* =========================================================
   CONFIRM TRANSFER
   ========================================================= */

$("#transferForm").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        try {
            const sourceAllocation = history.find(record => {
                return String(record.id) ===
                    String($("#historyId").value);
            });

            if (!sourceAllocation) {
                throw new Error("The original allocation could not be found.");
            }

            await api(
                "/rest/v1/rpc/transfer_tool",
                {
                    admin: true,
                    method: "POST",

                    body: JSON.stringify({
                        p_history_id:
                            $("#historyId").value,

                        p_technician:
                            $("#newTechnician")
                                .value
                                .trim(),

                        p_site:
                            $("#newSite")
                                .value
                                .trim(),

                        p_date:
                            $("#transferDate").value
                    })
                }
            );

            const transferredAllocations = await api(
                "/rest/v1/tool_history" +
                `?tool_id=eq.${encodeURIComponent(sourceAllocation.tool_id)}` +
                `&technician=eq.${encodeURIComponent($("#newTechnician").value.trim())}` +
                `&site=eq.${encodeURIComponent($("#newSite").value.trim())}` +
                `&assigned_on=eq.${encodeURIComponent($("#transferDate").value)}` +
                "&ended_on=is.null" +
                "&order=created_at.desc&limit=1"
            );

            if (transferredAllocations?.[0]?.id) {
                await api(
                    `/rest/v1/tool_history?id=eq.${encodeURIComponent(transferredAllocations[0].id)}`,
                    {
                        admin: true,
                        method: "PATCH",
                        headers: { Prefer: "return=minimal" },
                        body: JSON.stringify({
                            tool_number: sourceAllocation.tool_number || null
                        })
                    }
                );
            }

            $("#transfer").close();

            event.target.reset();

            showMessage(
                "Tool transferred."
            );

            await loadData();
        } catch (error) {
            showMessage(
                error.message,
                "error"
            );
        }
    }
);

/* =========================================================
   START APPLICATION
   ========================================================= */

showAuthentication();
loadData();

/*
 * Refresh shared records every 60 seconds.
 */

setInterval(
    loadData,
    60000
);
