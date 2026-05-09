# MIPS Assembly 3x3 Sudoku Game for MARS
# Logic + Console UI

.data
    # 3x3 Base Board (Solved state)
    # 1 2 3
    # 3 1 2
    # 2 3 1
    solved: .word 1, 2, 3, 3, 1, 2, 2, 3, 1
    
    # 3x3 Player Board (0 means empty '_')
    board:  .word 1, 2, 3, 3, 1, 2, 2, 3, 1
    
    # UI Strings
    title:     .asciiz "\n=== 3x3 SUDOKU ===\n"
    prompt_r:  .asciiz "Enter row (0-2): "
    prompt_c:  .asciiz "Enter col (0-2): "
    prompt_v:  .asciiz "Enter value (1-3): "
    win_msg:   .asciiz "\nCongratulations! You solved the Sudoku!\n"
    invalid:   .asciiz "Invalid input, please try again.\n"
    fixed_err: .asciiz "Cell is fixed, cannot be modified!\n"
    dup_err:   .asciiz "Invalid move! Number already exists in row or column.\n"
    newline:   .asciiz "\n"
    space:     .asciiz " "
    empty_c:   .asciiz "_"
    
    # Arrays to keep track of initially visible cells so player can't overwrite them
    # 1 means visible (fixed), 0 means hidden (editable)
    fixed:     .word 1, 1, 1, 1, 1, 1, 1, 1, 1
    
.text
.globl main

main:
    # --- Copy Solved to Board ---
    li $t0, 0
copy_loop:
    beq $t0, 9, setup_seed
    la $t1, solved
    sll $t2, $t0, 2
    add $t1, $t1, $t2
    lw $t3, 0($t1)
    
    la $t4, board
    add $t4, $t4, $t2
    sw $t3, 0($t4)
    
    addi $t0, $t0, 1
    j copy_loop

setup_seed:
    # --- Generate Puzzle (Randomly hide 4 cells) ---
    # Setup seed
    li $v0, 30          # Time syscall
    syscall
    move $a1, $a0       # lower 32 bits of time
    li $v0, 40          # Set seed syscall
    li $a0, 1           # Generator 1
    syscall

    # Hide 4 random cells
    li $t0, 0           # Hidden count = 0
hide_loop:
    beq $t0, 4, game_loop # If 4 cells hidden, start game
    
    li $v0, 42          # Random int range
    li $a0, 1           # Generator 1
    li $a1, 9           # Upper bound (0 to 8)
    syscall
    # $a0 has random index 0-8
    
    # Check if already hidden
    la $t1, fixed
    sll $t2, $a0, 2     # offset = index * 4
    add $t1, $t1, $t2   # address = fixed + offset
    lw $t3, 0($t1)
    beq $t3, $zero, hide_loop # If already 0, pick another
    
    # Set fixed[index] = 0
    sw $zero, 0($t1)
    
    # Set board[index] = 0
    la $t4, board
    add $t4, $t4, $t2
    sw $zero, 0($t4)
    
    addi $t0, $t0, 1    # Hidden count++
    j hide_loop

game_loop:
    # Print Title
    li $v0, 4
    la $a0, title
    syscall
    
    # --- Print Board ---
    li $t0, 0           # i = 0 (0 to 8)
print_loop:
    beq $t0, 9, get_input
    
    la $t1, board
    sll $t2, $t0, 2
    add $t1, $t1, $t2
    lw $t3, 0($t1)
    
    beq $t3, $zero, print_empty
    # Print number
    li $v0, 1
    move $a0, $t3
    syscall
    j print_space
    
print_empty:
    # Print '_'
    li $v0, 4
    la $a0, empty_c
    syscall
    
print_space:
    li $v0, 4
    la $a0, space
    syscall
    
    # Check newline
    addi $t4, $t0, 1
    li $t5, 3
    div $t4, $t5
    mfhi $t6
    bne $t6, $zero, next_cell
    
    li $v0, 4
    la $a0, newline
    syscall

next_cell:
    addi $t0, $t0, 1
    j print_loop


get_input:
    # Prompt row
    li $v0, 4
    la $a0, prompt_r
    syscall
    li $v0, 5
    syscall
    move $t7, $v0       # row in $t7
    blt $t7, 0, err_input
    bgt $t7, 2, err_input
    
    # Prompt col
    li $v0, 4
    la $a0, prompt_c
    syscall
    li $v0, 5
    syscall
    move $t8, $v0       # col in $t8
    blt $t8, 0, err_input
    bgt $t8, 2, err_input
    
    # Prompt val
    li $v0, 4
    la $a0, prompt_v
    syscall
    li $v0, 5
    syscall
    move $t9, $v0       # val in $t9
    blt $t9, 1, err_input
    bgt $t9, 3, err_input
    
    # Calculate index = row * 3 + col
    li $t0, 3
    mul $t1, $t7, $t0   # row * 3
    add $t1, $t1, $t8   # row * 3 + col
    
    # Check if cell is fixed
    la $t2, fixed
    sll $t3, $t1, 2     # index * 4
    add $t2, $t2, $t3
    lw $t4, 0($t2)
    bne $t4, $zero, err_fixed
    
    # --- Check Row for Duplicates ---
    li $t0, 0           # c = 0
check_row_loop:
    beq $t0, 3, check_col_init
    
    li $t1, 3
    mul $t2, $t7, $t1   # row * 3
    add $t2, $t2, $t0   # row * 3 + c
    
    la $t3, board
    sll $t4, $t2, 2     # index * 4
    add $t3, $t3, $t4
    lw $t5, 0($t3)      # board[row][c]
    
    beq $t5, $t9, err_duplicate
    
    addi $t0, $t0, 1
    j check_row_loop

check_col_init:
    # --- Check Col for Duplicates ---
    li $t0, 0           # r = 0
check_col_loop:
    beq $t0, 3, check_passed
    
    li $t1, 3
    mul $t2, $t0, $t1   # r * 3
    add $t2, $t2, $t8   # r * 3 + col
    
    la $t3, board
    sll $t4, $t2, 2     # index * 4
    add $t3, $t3, $t4
    lw $t5, 0($t3)      # board[r][col]
    
    beq $t5, $t9, err_duplicate
    
    addi $t0, $t0, 1
    j check_col_loop

check_passed:
    # Recalculate target index = row * 3 + col
    li $t0, 3
    mul $t1, $t7, $t0   # row * 3
    add $t1, $t1, $t8   # row * 3 + col
    sll $t3, $t1, 2     # index * 4

    # Update board
    la $t2, board
    add $t2, $t2, $t3
    sw $t9, 0($t2)
    
    # --- Check Win Condition ---
    li $t0, 0           # index = 0
check_loop:
    beq $t0, 9, win
    
    la $t1, board
    sll $t2, $t0, 2
    add $t1, $t1, $t2
    lw $t3, 0($t1)      # board[i]
    
    la $t4, solved
    add $t4, $t4, $t2
    lw $t5, 0($t4)      # solved[i]
    
    bne $t3, $t5, game_loop # if mismatch, not solved yet, continue game
    
    addi $t0, $t0, 1
    j check_loop

err_input:
    li $v0, 4
    la $a0, invalid
    syscall
    j game_loop
    
err_fixed:
    li $v0, 4
    la $a0, fixed_err
    syscall
    j game_loop

err_duplicate:
    li $v0, 4
    la $a0, dup_err
    syscall
    j game_loop
    
win:
    # Print final board
    li $v0, 4
    la $a0, title
    syscall
    
    li $t0, 0
win_print_loop:
    beq $t0, 9, win_msg_show
    la $t1, board
    sll $t2, $t0, 2
    add $t1, $t1, $t2
    lw $a0, 0($t1)
    li $v0, 1
    syscall
    li $v0, 4
    la $a0, space
    syscall
    addi $t4, $t0, 1
    li $t5, 3
    div $t4, $t5
    mfhi $t6
    bne $t6, $zero, win_next_cell
    li $v0, 4
    la $a0, newline
    syscall
win_next_cell:
    addi $t0, $t0, 1
    j win_print_loop

win_msg_show:
    li $v0, 4
    la $a0, win_msg
    syscall
    
    # Exit
    li $v0, 10
    syscall
