package com.studyflow.ai

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.NoteAlt
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.studyflow.ai.data.NoteEntity
import com.studyflow.ai.data.Priority
import com.studyflow.ai.data.TaskEntity
import com.studyflow.ai.ui.AppTab
import com.studyflow.ai.ui.AppUiState
import com.studyflow.ai.ui.ChatMessage
import com.studyflow.ai.ui.StudyFlowViewModel
import com.studyflow.ai.ui.formatDate
import com.studyflow.ai.ui.parseDeadline
import com.studyflow.ai.ui.theme.StudyFlowTheme
import kotlin.math.max

class MainActivity : ComponentActivity() {
    private val viewModel by viewModels<StudyFlowViewModel>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
        }

        setContent {
            val state by viewModel.uiState.collectAsStateWithLifecycle()
            StudyFlowTheme(darkTheme = state.isDarkMode) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    StudyFlowRoot(state = state, viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
private fun StudyFlowRoot(state: AppUiState, viewModel: StudyFlowViewModel) {
    AnimatedContent(targetState = state.isSignedIn, label = "auth-transition") { signedIn ->
        if (!signedIn) {
            AuthScreen(
                onSignIn = viewModel::signIn,
                onGoogle = viewModel::googleSignInMock
            )
        } else {
            MainScaffold(state = state, viewModel = viewModel)
        }
    }
}

@Composable
private fun AuthScreen(
    onSignIn: (String, String) -> Boolean,
    onGoogle: () -> Unit
) {
    var email by remember { mutableStateOf("student@studyflow.ai") }
    var password by remember { mutableStateOf("demo1234") }
    var error by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(MaterialTheme.colorScheme.surface, MaterialTheme.colorScheme.background)
                )
            )
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        ElevatedCard(
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(24.dp)
            ) {
                Text("StudyFlow AI", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black)
                Text(
                    "Plan smarter, study cleaner, and keep momentum without juggling five apps.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation()
                )
                AnimatedVisibility(error != null) {
                    Text(error.orEmpty(), color = MaterialTheme.colorScheme.error)
                }
                Button(
                    onClick = {
                        error = if (onSignIn(email, password)) null else "Use a valid email and 4+ character password."
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Sign in")
                }
                OutlinedButton(onClick = onGoogle, modifier = Modifier.fillMaxWidth()) {
                    Text("Continue with Google")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScaffold(state: AppUiState, viewModel: StudyFlowViewModel) {
    var showTaskDialog by remember { mutableStateOf(false) }
    var showNoteDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("StudyFlow AI", fontWeight = FontWeight.Black)
                        Text(
                            state.email.orEmpty(),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.setDarkMode(!state.isDarkMode) }) {
                        Icon(if (state.isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode, null)
                    }
                    IconButton(onClick = viewModel::signOut) {
                        Icon(Icons.Default.Logout, null)
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                navItems().forEach { item ->
                    NavigationBarItem(
                        selected = state.selectedTab == item.tab,
                        onClick = { viewModel.selectTab(item.tab) },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) }
                    )
                }
            }
        },
        floatingActionButton = {
            when (state.selectedTab) {
                AppTab.Tasks -> FloatingActionButton(onClick = { showTaskDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Add task")
                }
                AppTab.Notes -> FloatingActionButton(onClick = { showNoteDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Add note")
                }
                else -> Unit
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            when (state.selectedTab) {
                AppTab.Dashboard -> DashboardScreen(state, viewModel)
                AppTab.Tasks -> TasksScreen(state, viewModel, onAdd = { showTaskDialog = true })
                AppTab.Notes -> NotesScreen(state, viewModel, onAdd = { showNoteDialog = true })
                AppTab.Assistant -> AssistantScreen(state, viewModel)
                AppTab.Analytics -> AnalyticsScreen(state)
            }
        }
    }

    if (showTaskDialog) {
        TaskDialog(
            task = null,
            onDismiss = { showTaskDialog = false },
            onSave = { title, subject, description, priority, deadline ->
                viewModel.saveTask(null, title, subject, description, priority, deadline)
                showTaskDialog = false
            }
        )
    }
    if (showNoteDialog) {
        NoteDialog(
            note = null,
            onDismiss = { showNoteDialog = false },
            onSave = { title, body, tags ->
                viewModel.saveNote(null, title, body, tags)
                showNoteDialog = false
            }
        )
    }
}

@Composable
private fun DashboardScreen(state: AppUiState, viewModel: StudyFlowViewModel) {
    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { HeroCard(state) }
        item { SummaryGrid(state) }
        item { StudyPlanCard(viewModel.suggestedPlan()) }
        item {
            SectionCard("Today") {
                if (state.dailyTasks.isEmpty()) {
                    EmptyText("No hard deadline today. Pick one task and keep the streak warm.")
                } else {
                    state.dailyTasks.forEach { TaskRow(it, onToggle = viewModel::toggleTask, onDelete = viewModel::deleteTask) }
                }
            }
        }
        item {
            SectionCard("Upcoming deadlines") {
                if (state.upcomingDeadlines.isEmpty()) EmptyText("No upcoming deadlines yet.")
                state.upcomingDeadlines.forEach { DeadlineRow(it) }
            }
        }
    }
}

@Composable
private fun TasksScreen(state: AppUiState, viewModel: StudyFlowViewModel, onAdd: () -> Unit) {
    var editing by remember { mutableStateOf<TaskEntity?>(null) }

    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageHeader(
                title = "Smart Tasks",
                subtitle = "Break work down, prioritize deadlines, and tap a checkbox when finished.",
                action = { Button(onClick = onAdd) { Text("Add task") } }
            )
        }
        if (state.tasks.isEmpty()) {
            item { EmptyLarge("Create your first study task to unlock progress and AI planning.") }
        }
        items(state.tasks, key = { it.id }) { task ->
            EditableTaskCard(
                task = task,
                onToggle = viewModel::toggleTask,
                onDelete = viewModel::deleteTask,
                onEdit = { editing = it },
                steps = viewModel.breakDown(task.title)
            )
        }
    }

    editing?.let { task ->
        TaskDialog(
            task = task,
            onDismiss = { editing = null },
            onSave = { title, subject, description, priority, deadline ->
                viewModel.saveTask(task, title, subject, description, priority, deadline)
                editing = null
            }
        )
    }
}

@Composable
private fun NotesScreen(state: AppUiState, viewModel: StudyFlowViewModel, onAdd: () -> Unit) {
    var editing by remember { mutableStateOf<NoteEntity?>(null) }

    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            PageHeader(
                title = "Notes",
                subtitle = "Capture revision notes and tag them by subject, exam, or topic.",
                action = { Button(onClick = onAdd) { Text("Add note") } }
            )
        }
        if (state.notes.isEmpty()) {
            item { EmptyLarge("No notes yet. Add a quick topic summary after each study block.") }
        }
        items(state.notes, key = { it.id }) { note ->
            NoteCard(note, onEdit = { editing = note }, onDelete = { viewModel.deleteNote(note) })
        }
    }

    editing?.let { note ->
        NoteDialog(
            note = note,
            onDismiss = { editing = null },
            onSave = { title, body, tags ->
                viewModel.saveNote(note, title, body, tags)
                editing = null
            }
        )
    }
}

@Composable
private fun AssistantScreen(state: AppUiState, viewModel: StudyFlowViewModel) {
    var prompt by remember { mutableStateOf("") }

    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            PageHeader(
                title = "AI Assistant",
                subtitle = "Local, offline planning help for tasks, notes, and deadlines."
            )
        }
        item {
            SectionCard("Suggested plan") {
                viewModel.suggestedPlan().forEach { Text("• $it", modifier = Modifier.padding(vertical = 4.dp)) }
            }
        }
        items(state.assistantMessages) { message ->
            ChatBubble(message)
        }
        item {
            ElevatedCard(shape = RoundedCornerShape(24.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = prompt,
                        onValueChange = { prompt = it },
                        label = { Text("Ask for a plan, priority help, or steps") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )
                    Button(
                        onClick = {
                            viewModel.askAssistant(prompt)
                            prompt = ""
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Ask StudyFlow")
                    }
                }
            }
        }
    }
}

@Composable
private fun AnalyticsScreen(state: AppUiState) {
    LazyColumn(
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            PageHeader(
                title = "Analytics",
                subtitle = "Track output, completion rate, points, and streaks."
            )
        }
        item { SummaryGrid(state) }
        item {
            SectionCard("Completed tasks per day") {
                ProductivityChart(state)
            }
        }
        item {
            SectionCard("Focus signals") {
                Text("Completion rate: ${(state.progress * 100).toInt()}%")
                Text("Notes saved: ${state.notes.size}")
                Text("Active high-priority tasks: ${state.activeTasks.count { it.priorityEnum == Priority.High }}")
            }
        }
    }
}

@Composable
private fun HeroCard(state: AppUiState) {
    ElevatedCard(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.primary)
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Today’s command center", color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineSmall)
            Text(
                "You have ${state.activeTasks.size} active task(s), ${state.upcomingDeadlines.size} deadline(s), and ${state.notes.size} note(s).",
                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.86f)
            )
            LinearProgressIndicator(progress = { state.progress }, modifier = Modifier.fillMaxWidth())
            Text("${(state.progress * 100).toInt()}% complete", color = MaterialTheme.colorScheme.onPrimary)
        }
    }
}

@Composable
private fun SummaryGrid(state: AppUiState) {
    BoxWithConstraints {
        val wide = maxWidth > 620.dp
        val cards = listOf(
            "Tasks" to "${state.completedTasks.size}/${state.tasks.size}",
            "Deadlines" to "${state.upcomingDeadlines.size}",
            "Points" to "${state.points}",
            "Streak" to "${state.streak}"
        )
        if (wide) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                cards.forEach { SummaryCard(it.first, it.second, Modifier.weight(1f)) }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                cards.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        row.forEach { SummaryCard(it.first, it.second, Modifier.weight(1f)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(label: String, value: String, modifier: Modifier = Modifier) {
    ElevatedCard(modifier = modifier, shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun StudyPlanCard(plan: List<String>) {
    SectionCard("AI study plan") {
        plan.forEach { Text("• $it", modifier = Modifier.padding(vertical = 3.dp)) }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    ElevatedCard(shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            content()
        }
    }
}

@Composable
private fun PageHeader(title: String, subtitle: String, action: (@Composable () -> Unit)? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (action != null) action()
    }
}

@Composable
private fun EditableTaskCard(
    task: TaskEntity,
    onToggle: (TaskEntity) -> Unit,
    onDelete: (TaskEntity) -> Unit,
    onEdit: (TaskEntity) -> Unit,
    steps: List<String>
) {
    var expanded by remember { mutableStateOf(false) }
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .animateContentSize(),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            TaskHeader(task, onToggle)
            Text(task.description.ifBlank { "No description yet." }, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                PriorityChip(task.priorityEnum)
                AssistChip(onClick = {}, label = { Text(formatDate(task.deadlineMillis)) })
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { onEdit(task) }) { Icon(Icons.Default.Edit, contentDescription = "Edit") }
                IconButton(onClick = { onDelete(task) }) { Icon(Icons.Default.Delete, contentDescription = "Delete") }
            }
            TextButton(onClick = { expanded = !expanded }) {
                Text(if (expanded) "Hide AI steps" else "Break into AI steps")
            }
            AnimatedVisibility(expanded) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    steps.forEach { Text("• $it") }
                }
            }
        }
    }
}

@Composable
private fun TaskRow(task: TaskEntity, onToggle: (TaskEntity) -> Unit, onDelete: (TaskEntity) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Checkbox(checked = task.completed, onCheckedChange = { onToggle(task) })
        Column(Modifier.weight(1f)) {
            Text(task.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${task.subject.ifBlank { "General" }} • ${formatDate(task.deadlineMillis)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        IconButton(onClick = { onDelete(task) }) { Icon(Icons.Default.Delete, contentDescription = "Delete") }
    }
}

@Composable
private fun DeadlineRow(task: TaskEntity) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = priorityColor(task.priorityEnum))
        Spacer(Modifier.width(10.dp))
        Column {
            Text(task.title, fontWeight = FontWeight.Bold)
            Text(formatDate(task.deadlineMillis), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun TaskHeader(task: TaskEntity, onToggle: (TaskEntity) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = task.completed, onCheckedChange = { onToggle(task) })
        Column(Modifier.weight(1f)) {
            Text(task.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text(task.subject.ifBlank { "General" }, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun NoteCard(note: NoteEntity, onEdit: () -> Unit, onDelete: () -> Unit) {
    ElevatedCard(shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(note.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text(note.tags.ifBlank { "No tags" }, color = MaterialTheme.colorScheme.primary)
                }
                IconButton(onClick = onEdit) { Icon(Icons.Default.Edit, contentDescription = "Edit") }
                IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, contentDescription = "Delete") }
            }
            Text(note.body, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ChatBubble(message: ChatMessage) {
    val fromUser = message.author == "You"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (fromUser) Arrangement.End else Arrangement.Start
    ) {
        ElevatedCard(
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.elevatedCardColors(
                containerColor = if (fromUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface
            ),
            modifier = Modifier.fillMaxWidth(0.88f)
        ) {
            Column(Modifier.padding(14.dp)) {
                Text(message.author, fontWeight = FontWeight.Bold, color = if (fromUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary)
                Text(message.text, color = if (fromUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

@Composable
private fun ProductivityChart(state: AppUiState) {
    val bars = state.productivity
    if (bars.isEmpty()) {
        EmptyText("Complete tasks to generate analytics.")
        return
    }
    val maxValue = max(1, bars.maxOf { it.completedCount })
    val barColor = MaterialTheme.colorScheme.primary
    val gridColor = MaterialTheme.colorScheme.outlineVariant
    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp)
            .padding(top = 12.dp)
    ) {
        val widthPerBar = size.width / bars.size
        repeat(4) { index ->
            val y = size.height * index / 3f
            drawLine(
                color = gridColor,
                start = Offset(0f, y),
                end = Offset(size.width, y),
                strokeWidth = 1.dp.toPx(),
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f))
            )
        }
        bars.forEachIndexed { index, point ->
            val barHeight = size.height * (point.completedCount / maxValue.toFloat())
            val left = index * widthPerBar + widthPerBar * 0.2f
            drawLine(
                color = barColor,
                start = Offset(left + widthPerBar * 0.3f, size.height),
                end = Offset(left + widthPerBar * 0.3f, size.height - barHeight),
                strokeWidth = widthPerBar * 0.42f,
                cap = StrokeCap.Round
            )
        }
    }
}

@Composable
private fun TaskDialog(
    task: TaskEntity?,
    onDismiss: () -> Unit,
    onSave: (String, String, String, Priority, Long?) -> Unit
) {
    var title by remember { mutableStateOf(task?.title.orEmpty()) }
    var subject by remember { mutableStateOf(task?.subject.orEmpty()) }
    var description by remember { mutableStateOf(task?.description.orEmpty()) }
    var deadline by remember { mutableStateOf(task?.deadlineMillis?.let(::formatDate).orEmpty()) }
    var priority by remember { mutableStateOf(task?.priorityEnum ?: Priority.Medium) }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(onClick = { onSave(title, subject, description, priority, parseDeadline(deadline)) }) {
                Text("Save")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        title = { Text(if (task == null) "Add task" else "Edit task") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("Task title") }, singleLine = true)
                OutlinedTextField(subject, { subject = it }, label = { Text("Subject") }, singleLine = true)
                OutlinedTextField(description, { description = it }, label = { Text("Description") }, minLines = 2)
                OutlinedTextField(deadline, { deadline = it }, label = { Text("Deadline YYYY-MM-DD") }, singleLine = true)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Priority.entries.forEach { option ->
                        if (priority == option) {
                            Button(onClick = { priority = option }) {
                                Text(option.label)
                            }
                        } else {
                            OutlinedButton(onClick = { priority = option }) {
                                Text(option.label)
                            }
                        }
                    }
                }
            }
        }
    )
}

@Composable
private fun NoteDialog(
    note: NoteEntity?,
    onDismiss: () -> Unit,
    onSave: (String, String, String) -> Unit
) {
    var title by remember { mutableStateOf(note?.title.orEmpty()) }
    var body by remember { mutableStateOf(note?.body.orEmpty()) }
    var tags by remember { mutableStateOf(note?.tags.orEmpty()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { Button(onClick = { onSave(title, body, tags) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        title = { Text(if (note == null) "Add note" else "Edit note") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("Title") }, singleLine = true)
                OutlinedTextField(tags, { tags = it }, label = { Text("Tags") }, singleLine = true)
                OutlinedTextField(body, { body = it }, label = { Text("Note") }, minLines = 5)
            }
        }
    )
}

@Composable
private fun PriorityChip(priority: Priority) {
    val chipColor = priorityColor(priority)
    AssistChip(
        onClick = {},
        label = { Text(priority.label) },
        leadingIcon = {
            Canvas(Modifier.size(10.dp)) {
                drawCircle(chipColor)
            }
        }
    )
}

@Composable
private fun EmptyText(text: String) {
    Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun EmptyLarge(text: String) {
    ElevatedCard(shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(40.dp))
            Spacer(Modifier.height(8.dp))
            Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun priorityColor(priority: Priority): Color {
    return when (priority) {
        Priority.Low -> Color(0xFF22C55E)
        Priority.Medium -> Color(0xFFF59E0B)
        Priority.High -> Color(0xFFEF4444)
    }
}

private data class NavItem(val tab: AppTab, val label: String, val icon: ImageVector)

private fun navItems(): List<NavItem> = listOf(
    NavItem(AppTab.Dashboard, "Home", Icons.Default.Home),
    NavItem(AppTab.Tasks, "Tasks", Icons.Default.TaskAlt),
    NavItem(AppTab.Notes, "Notes", Icons.Default.NoteAlt),
    NavItem(AppTab.Assistant, "AI", Icons.Default.AutoAwesome),
    NavItem(AppTab.Analytics, "Stats", Icons.Default.Analytics)
)
