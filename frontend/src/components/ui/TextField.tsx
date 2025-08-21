import { TextField as MuiTextField, TextFieldProps, styled } from '@mui/material';

const StyledTextField = styled(MuiTextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: theme.palette.grey[300],
      borderRadius: 8,
    },
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: 1,
    },
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    marginTop: 4,
  },
}));

export const TextField = (props: TextFieldProps) => {
  return (
    <StyledTextField
      fullWidth
      variant="outlined"
      margin="normal"
      {...props}
      InputLabelProps={{
        shrink: true,
        ...props.InputLabelProps,
      }}
    />
  );
};

export default TextField;
