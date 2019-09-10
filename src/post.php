<!DOCTYPE html>
<html lang="en" data-async-title="New Title" data-async-scripts=".run-this-one">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Title</title>
</head>
<body>
<?php

// log form information
print_r($_POST);

// show posted files
print_r($_FILES);

// create file entry so we can see it works
move_uploaded_file( $_FILES['picture']['tmp_name'], './upload/' . $_FILES['picture']['name']);
?>

<script>console.log('Not run on replace, only on refresh')</script>

<script class="run-this-one">console.log('Run on replace, also on refresh')</script>

</body>
</html>